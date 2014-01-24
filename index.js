angular
	.module('digger.editor', [
		require('digger-for-angular')
	])

  .directive('diggerEditor', function(){


    //field.required && showvalidate && containerForm[field.name].$invalid
    return {
      restrict:'EA',
      scope:{
        fields:'=',
        container:'=',
        fieldclass:'@',
        readonly:'@',
        showedit:'='
      },
      replace:true,
      template:require('./template'),
      controller:function($scope){

        $scope.default_child_selector = '>*:sort(name):limit(0,100)';
    		$scope.viewersettings = {
    			showjson:true,
          showdigger:true,
          container_url:true,
          container_branch:true,
          readonly:true,
          showup:true,
          showselector:true,
          child_selector:$scope.default_child_selector,
          buttons:[{
            id:'delete',
            title:'delete',
            class:'btn-warning'
          },{
            id:'import',
            title:'import',
            class:'btn-primary'
          }],
          filterchildren:function(child){
            return !system_tags[child.tag()];
          },
          hidebuttonfn:function(button){
            if($scope.viewer_container && $scope.viewer_container.tag()=='_supplychain' && button.id=='delete'){
              return true;
            }
            else{
              return false;
            }
          },
          blueprints:[],
          nodelete:function(){
            if(!$scope.viewer_container){
              return false;
            }
            return $scope.viewer_container.tag()=='_supplychain';
          }
        }
       
        

        

        function growl(message, type){
          type = type || 'info';
          $.bootstrapGrowl(message, {
            ele: 'body', // which element to append to
            type: type, // (null, 'info', 'error', 'success')
            offset: {from: 'top', amount: 20}, // 'top', or 'bottom'
            align: 'right', // ('left', 'right', or 'center')
            width: 250, // (integer, or 'auto')
            delay: 4000,
            allow_dismiss: true,
            stackup_spacing: 10 // spacing between consecutively stacked growls.
          });
        }


    		/*
    		
    			icons
    			
    		*/

        var foldericons = {
          folder:true,
          _supplychain:true
        }

        $scope.iconfn = function(container){
          if(!container){
            return '';
          }
          if(container.digger('icon')){
            return container.digger('icon');
          }
          return foldericons[container.tag()] ? 'fa-folder' : 'fa-file';
        }

    		/*
    		
    			load the children of a given container

    		*/
    		function load_container_children(container, done){
          if(!container){
            return;
          }
    			container($scope.viewersettings.child_selector).ship(function(children){
    				$safeApply($scope, function(){
    					container.models[0]._children = children.filter(function(c){
                return c.tag()!='blueprint';
              }).models;
    					done && done(null, children);
    				})
    			})
    		}

        $scope.$on('viewer:reset_selector', function(){
          $scope.viewersettings.child_selector = $scope.default_child_selector;
        })

        $scope.$watch('viewersettings.child_selector', function(selector){
          load_container_children($scope.viewer_container, function(){

          })
        })

    		function activate_container(container, done){
          
    			load_container_children(container, function(error){
            $scope.viewer_container = container;
    				$scope.viewer_blueprint = $digger.blueprint.get(container.digger('blueprint') || container.tag());

            if(!$scope.viewer_blueprint){
              $scope.viewer_blueprint = $digger.blueprint.build_default(container);
            }

            container.data('loaded', true);
            if(!container.children().isEmpty()){
              $scope.viewer_container.data('expanded', true);
            }
    				done && done();
    			});
    		}

        function refresh_container(done){
          $safeApply($scope, function(){
            activate_container($scope.viewer_container, done);
          })
          
        }

    		/*
    		
    			called once we have confirmed read access
    			
    		


        function load_initial_folders(){

          if($scope.initial_folders && $scope.initial_folders.length>=0){
            var name = $scope.initial_folders.shift();
            
            var to_load = $scope.viewer_container.find('>[name=' + name + ']');

            if(to_load.isEmpty()){
              return;
            }

            activate_container(to_load, function(){
              $scope.$broadcast('tree:setselected', to_load.get(0));
              load_initial_folders();
            })

            
          }
          
        }*/

    		function initialize(){
    			activate_container($scope.warehouse_root, function(){
    				$scope.tree_root = $scope.warehouse_root;

            setTimeout(function(){
              $safeApply($scope, function(){
                $scope.openroot();
                //load_initial_folders();

              }, 100)
            })
    			})
    			
    		}

        // they clicked the root from the breadcrumbs
        $scope.openroot = function(){
          $scope.tabmode = 'folders';
          activate_container($scope.tree_root);
          $scope.$broadcast('tree:setselected', $scope.tree_root.get(0));
        }

        $scope.openancestor = function(ancestor){
          $scope.tabmode = 'folders';
          activate_container(ancestor);
          $scope.$broadcast('tree:setselected', ancestor.get(0));
        }

        $scope.$on('tree:ancestors', function(ev, ancestors){
          if(ancestors[0].diggerid()==$scope.tree_root.diggerid()){
            ancestors.shift();
          }
          $scope.ancestors = ancestors;
        }) 


        /*
        
          open a container
          
        */
        $scope.$on('tree:selected', function(ev, container){

          $scope.tabmode = 'folders';
          $scope.add_parent_container = null;

          activate_container(container, function(){
          	if(container.tag()=='folder' || container.tag()=='_supplychain'){
    	        $scope.$broadcast('viewer:mode', 'children');
    	      }
            
            $scope.$broadcast('tree:setselected', container.get(0));
          })
          
        })

        /*
        
          open a container
        */
        
        $scope.$on('viewer:selected', function(ev, container, force){

          /*
          if(!force){
            var is_selected = container.data('selected') || false;
            container.data('selected', !is_selected);  
          }
          else{      
            */
            $scope.add_parent_container = null;

            activate_container(container, function(){
            
              if(container.tag()=='folder'){
                $scope.$broadcast('viewer:mode', 'children');
              }

              $scope.$broadcast('tree:setselected', container.get(0));
            })
          //}
        })

        /*
        
          restore from cancelling an add
          */
       
        $scope.$on('viewer:canceladd', function(ev){
          $scope.viewer_container = $scope.add_parent_container;
          $scope.viewer_blueprint = $scope.add_parent_blueprint;
          $scope.$broadcast('viewer:mode', 'children');
        }) 

        $scope.$on('viewer:up', function(){
          var parent = $scope.tree_root.find('=' + $scope.viewer_container.diggerparentid());

          if(!parent || parent.count()<=0){
            parent = $scope.warehouse_root;
          }

          $safeApply($scope, function(){        
            $scope.viewer_container = parent;
            $scope.viewer_blueprint = $digger.blueprint.get(parent.tag());
            $scope.$broadcast('viewer:mode', 'children');
            $scope.add_parent_container = null;
            $scope.$broadcast('tree:setselected', parent.get(0));
            update_meta();
          })
        })

        /*
        
          added from viewer
        */
      
        $scope.$on('viewer:add', function(ev, blueprint){

          $scope.add_parent_container = $scope.viewer_container;
          $scope.add_parent_blueprint = $scope.viewer_blueprint;


          $digger.blueprint.process(blueprint);
    //      blueprint.fields = blueprint.find('field').models
    //$digger.create(blueprint.attr('name'));

          $scope.viewer_container = $digger.blueprint.create(blueprint);
          $scope.viewer_container.diggerwarehouse($scope.add_parent_container.diggerwarehouse());
          $scope.viewer_container.data('new', true);
          $scope.viewer_blueprint = blueprint;

        })  

        /*
        
          removal from viewer - they have clicked OK
        */
        $scope.$on('viewer:remove', function(ev){

          $scope.viewer_container.remove().ship(function(){
            growl($scope.viewer_container.title() + ' removed');
            var parent = $scope.tree_root.find('=' + $scope.viewer_container.diggerparentid());

            if(!parent || parent.count()<=0){
              parent = $scope.warehouse_root;
            }

            $safeApply($scope, function(){
              $scope.something_removed = true;
              $scope.viewer_container = parent;
              $scope.viewer_blueprint = $digger.blueprint.get(parent.tag());
              $scope.$broadcast('viewer:mode', 'children');
              $scope.add_parent_container = null;
              $scope.$broadcast('tree:setselected', parent.get(0));
              update_meta();
            })
            
          })
        })  

        $scope.$on('viewer:save', function(ev){

          // this means new container
          
          //$scope.viewer_container.data('tree_filter', $scope.viewer_container.match('folder'));
          if($scope.add_parent_container){
            $scope.add_parent_container.append($scope.viewer_container).ship(function(){
              $safeApply($scope, function(){
                $scope.viewer_container.data('new', false);
                if($scope.add_parent_container){
                  $scope.add_parent_container.data('expanded', true);  
                }
                
                growl($scope.viewer_container.title() + ' added');
                $scope.viewer_container = $scope.add_parent_container;
                $scope.viewer_blueprint = $scope.add_parent_blueprint;
                $scope.$broadcast('viewer:mode', 'children');
                $scope.add_parent_container = null;
                update_meta();
              })
            })
          }
          else{
            $scope.viewer_container.save().ship(function(){
              growl($scope.viewer_container.title() + ' saved');
              $safeApply($scope, function(){
                if($scope.viewer_container.tag()=='folder'){
                  $scope.$broadcast('viewer:mode', 'children');
                }
                update_meta();
              })
              
            })
          }

          //$scope.$emit('viewer:up');
        })

        $scope.$on('viewer:button', function(ev, button){
          if(button.id=='delete'){
            $scope.$broadcast('viewer:delete:press');
          }
          else if(button.id=='import'){
            $scope.importmode = true;
          }
        })



    	}
    }
  })


