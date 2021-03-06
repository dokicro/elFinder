"use strict";
/**
 * @class  elFinder folders tree
 *
 * @author Dmitry (dio) Levashov
 **/
$.fn.elfindertree = function(fm, opts) {
	var treeclass = fm.res('class', 'tree');
	
	this.not('.'+treeclass).each(function() {

		var c = 'class', mobile = fm.UA.Mobile,
			
			/**
			 * Root directory class name
			 *
			 * @type String
			 */
			root      = fm.res(c, 'treeroot'),

			/**
			 * Open root dir if not opened yet
			 *
			 * @type Boolean
			 */
			openRoot  = opts.openRootOnLoad,

			/**
			 * Open current work dir if not opened yet
			 *
			 * @type Boolean
			 */
			openCwd   = opts.openCwdOnOpen,

			/**
			 * Subtree class name
			 *
			 * @type String
			 */
			subtree   = fm.res(c, 'navsubtree'),
			
			/**
			 * Directory class name
			 *
			 * @type String
			 */
			navdir    = fm.res(c, 'treedir'),
			
			/**
			 * Directory CSS selector
			 *
			 * @type String
			 */
			selNavdir = 'span.' + navdir,
			
			/**
			 * Collapsed arrow class name
			 *
			 * @type String
			 */
			collapsed = fm.res(c, 'navcollapse'),
			
			/**
			 * Expanded arrow class name
			 *
			 * @type String
			 */
			expanded  = fm.res(c, 'navexpand'),
			
			/**
			 * Class name to mark arrow for directory with already loaded children
			 *
			 * @type String
			 */
			loaded    = 'elfinder-subtree-loaded',
			
			/**
			 * Arraw class name
			 *
			 * @type String
			 */
			arrow = fm.res(c, 'navarrow'),
			
			/**
			 * Current directory class name
			 *
			 * @type String
			 */
			active    = fm.res(c, 'active'),
			
			/**
			 * Droppable dirs dropover class
			 *
			 * @type String
			 */
			dropover = fm.res(c, 'adroppable'),
			
			/**
			 * Hover class name
			 *
			 * @type String
			 */
			hover    = fm.res(c, 'hover'),
			
			/**
			 * Disabled dir class name
			 *
			 * @type String
			 */
			disabled = fm.res(c, 'disabled'),
			
			/**
			 * Draggable dir class name
			 *
			 * @type String
			 */
			draggable = fm.res(c, 'draggable'),
			
			/**
			 * Droppable dir  class name
			 *
			 * @type String
			 */
			droppable = fm.res(c, 'droppable'),
			
			/**
			 * Un-disabled cmd `paste` volume's root wrapper class
			 * 
			 * @type String
			 */
			pastable = 'elfinder-navbar-wrapper-pastable',
			
			insideNavbar = function(x) {
				var left = navbar.offset().left;
					
				return left <= x && x <= left + navbar.width();
			},
			
			drop = fm.droppable.drop,
			
			/**
			 * Droppable options
			 *
			 * @type Object
			 */
			droppableopts = $.extend(true, {}, fm.droppable, {
				// show subfolders on dropover
				over : function(e) { 
					var link = $(this),
						cl   = hover+' '+dropover;

					if (insideNavbar(e.clientX)) {
						link.addClass(hover)
						if (link.is('.'+collapsed+':not(.'+expanded+')')) {
							link.data('expandTimer', setTimeout(function() {
								link.children('.'+arrow).click();
							}, 500));
						}
					} else {
						link.removeClass(cl);
					}
				},
				out : function() {
					var link = $(this);
					link.data('expandTimer') && clearTimeout(link.data('expandTimer'));
					link.removeClass(hover);
				},
				drop : function(e, ui) { insideNavbar(e.clientX) && drop.call(this, e, ui); }
			}),
			
			spinner = $(fm.res('tpl', 'navspinner')),
			
			/**
			 * Directory html template
			 *
			 * @type String
			 */
			tpl = fm.res('tpl', 'navdir'),
			
			/**
			 * Permissions marker html template
			 *
			 * @type String
			 */
			ptpl = fm.res('tpl', 'perms'),
			
			/**
			 * Lock marker html template
			 *
			 * @type String
			 */
			ltpl = fm.res('tpl', 'lock'),
			
			/**
			 * Symlink marker html template
			 *
			 * @type String
			 */
			stpl = fm.res('tpl', 'symlink'),
			
			/**
			 * Html template replacement methods
			 *
			 * @type Object
			 */
			replace = {
				id          : function(dir) { return fm.navHash2Id(dir.hash) },
				cssclass    : function(dir) {
					var cname = (fm.UA.Touch ? 'elfinder-touch ' : '')+(dir.phash ? '' : root)+' '+navdir+' '+fm.perms2class(dir);
					dir.dirs && !dir.link && (cname += ' ' + collapsed);
					opts.getClass && (cname += ' ' + opts.getClass(dir));
					dir.csscls && (cname += ' ' + fm.escape(dir.csscls));
					return cname;
				},
				permissions : function(dir) { return !dir.read || !dir.write ? ptpl : ''; },
				symlink     : function(dir) { return dir.alias ? stpl : ''; },
				style       : function(dir) { return dir.icon ? 'style="background-image:url(\''+fm.escape(dir.icon)+'\')"' : ''; }
			},
			
			/**
			 * Return html for given dir
			 *
			 * @param  Object  directory
			 * @return String
			 */
			itemhtml = function(dir) {
				dir.name = fm.escape(dir.i18 || dir.name);
				
				return tpl.replace(/(?:\{([a-z]+)\})/ig, function(m, key) {
					return dir[key] || (replace[key] ? replace[key](dir) : '');
				});
			},
			
			/**
			 * Return only dirs from files list
			 *
			 * @param  Array  files list
			 * @return Array
			 */
			filter = function(files) {
				return $.map(files||[], function(f) { return f.mime == 'directory' ? f : null });
			},
			
			/**
			 * Find parent subtree for required directory
			 *
			 * @param  String  dir hash
			 * @return jQuery
			 */
			findSubtree = function(hash) {
				return hash ? $('#'+fm.navHash2Id(hash)).next('.'+subtree) : tree;
			},
			
			/**
			 * Find directory (wrapper) in required node
			 * before which we can insert new directory
			 *
			 * @param  jQuery  parent directory
			 * @param  Object  new directory
			 * @return jQuery
			 */
			findSibling = function(subtree, dir) {
				var node = subtree.children(':first'),
					info, compare;

				compare = fm.naturalCompare;
				while (node.length) {
					info = fm.file(fm.navId2Hash(node.children('[id]').attr('id')));
					
					if ((info = fm.file(fm.navId2Hash(node.children('[id]').attr('id')))) 
					&& compare(dir.name, info.name) < 0) {
						return node;
					}
					node = node.next();
				}
				return $('');
			},
			
			/**
			 * Add new dirs in tree
			 *
			 * @param  Array  dirs list
			 * @return void
			 */
			updateTree = function(dirs) {
				var length  = dirs.length,
					orphans = [],
					i = dirs.length,
					dir, html, parent, sibling, init, atonce = {};

				var firstVol = true; // check for netmount volume
				while (i--) {
					dir = dirs[i];

					if ($('#'+fm.navHash2Id(dir.hash)).length) {
						continue;
					}
					
					if ((parent = findSubtree(dir.phash)).length) {
						if (dir.phash && ((init = !parent.children().length) || (sibling = findSibling(parent, dir)).length)) {
							if (init) {
								if (!atonce[dir.phash]) {
									atonce[dir.phash] = [];
								}
								atonce[dir.phash].push(dir);
							} else {
								sibling.before(itemhtml(dir));
							}
						} else {
							parent[firstVol || dir.phash ? 'append' : 'prepend'](itemhtml(dir));
							firstVol = false;
							if (!dir.phash && dir.disabled) {
								if ($.inArray('paste', dir.disabled) === -1) {
									$('#'+fm.navHash2Id(dir.hash)).parent().addClass(pastable);
								}
							}
						}
					} else {
						orphans.push(dir);
					}
				}

				// When init, html append at once
				if (Object.keys(atonce).length){
					$.each(atonce, function(p, dirs){
						var parent = findSubtree(p),
						    html   = [];
						dirs.sort(compare);
						$.each(dirs, function(i, d){
							html.push(itemhtml(d));
						});
						parent.append(html.join(''));
					});
				}
				
				if (orphans.length && orphans.length < length) {
					return updateTree(orphans);
				} 
				
				if (!mobile) {
					updateDroppable();
				}
				
			},
			
			/**
			 * sort function by dir.name
			 * 
			 */
			compare = function(dir1, dir2) {
				return fm.naturalCompare(dir1.name, dir2.name);
			},

			/**
			 * Auto scroll to cwd
			 *
			 * @return void
			 */
			autoScroll = function() {
				var current = $('#'+fm.navHash2Id(fm.cwd().hash));
				
				if (current.length) {
					var parent = tree.parent().stop(false, true),
					top = parent.offset().top,
					treeH = parent.height(),
					bottom = top + treeH - current.outerHeight(),
					tgtTop = current.offset().top;
					
					if (tgtTop < top || tgtTop > bottom) {
						parent.animate({ scrollTop : parent.scrollTop() + tgtTop - top - treeH / 3 }, { duration : 'fast' });
					}
				}
			},
			
			/**
			 * Mark current directory as active
			 * If current directory is not in tree - load it and its parents
			 *
			 * @param {Boolean} do not expand cwd
			 * @return void
			 */
			sync = function(noCwd, dirs) {
				var cwd     = fm.cwd(),
					cwdhash = cwd.hash,
					current = $('#'+fm.navHash2Id(cwdhash)), 
					noCwd   = noCwd || false,
					dirs    = dirs || [],
					rootNode, dir, link, subs, subsLen, cnt;
				
				if (openRoot) {
					rootNode = $('#'+fm.navHash2Id(fm.root()));
					rootNode.hasClass(loaded) && rootNode.addClass(expanded).next('.'+subtree).show();
					openRoot = false;
				}
				
				if (!current.hasClass(active)) {
					tree.find(selNavdir+'.'+active).removeClass(active);
					current.addClass(active);
				}

				if (opts.syncTree || !current.length) {
					if (current.length) {
						if (!noCwd) {
							current.addClass(loaded);
							if (openCwd && current.hasClass(collapsed)) {
								current.addClass(expanded).next('.'+subtree).slideDown();
							}
						}
						subs = current.parentsUntil('.'+root).filter('.'+subtree);
						subsLen = subs.length;
						cnt = 1;
						subs.show().prev(selNavdir).addClass(expanded, function(){
							!noCwd && subsLen == cnt++ && autoScroll();
						});
						!subsLen && !noCwd && autoScroll();
						return;
					}
					if (fm.newAPI) {
						dir = fm.file(cwdhash);
						if (dir && dir.phash) {
							link = $('#'+fm.navHash2Id(dir.phash));
							if (link.length && link.hasClass(loaded)) {
								updateTree([dir]);
								sync(noCwd);
								return;
							}
						}
						link  = cwd.root? $('#'+fm.navHash2Id(cwd.root)) : null;
						if (link) {
							spinner.insertBefore(link.children('.'+arrow));
							link.removeClass(collapsed);
						}
						fm.request({
							data : {cmd : 'parents', target : cwdhash},
							preventFail : true
						})
						.done(function(data) {
							dirs = $.merge(dirs, filter(data.tree));
							updateTree(dirs);
							updateArrows(dirs, loaded);
							cwdhash == fm.cwd().hash && sync(noCwd);
						})
						.always(function(data) {
							if (link) {
								spinner.remove();
								link.addClass(collapsed+' '+loaded);
							}
						});
					}
					
				}
			},
			
			/**
			 * Make writable and not root dirs droppable
			 *
			 * @return void
			 */
			updateDroppable = function(target) {
				var limit = 100,
					next;
				target = target || tree.find('div.'+pastable).find(selNavdir+':not(.'+droppable+',.elfinder-ro,.elfinder-na)');
				if (target.length > limit) {
					next = target.slice(limit);
					target = target.slice(0, limit);
				}
				target.droppable(droppableopts).each(function(){
					fm.makeDirectDropUpload(this, fm.navId2Hash(this.id));
				});
				if (next) {
					setTimeout(function(){
						updateDroppable(next);
					}, 20);
				}
			},
			
			/**
			 * Check required folders for subfolders and update arrow classes
			 *
			 * @param  Array  folders to check
			 * @param  String css class 
			 * @return void
			 */
			updateArrows = function(dirs, cls) {
				var sel = cls == loaded
						? '.'+collapsed+':not(.'+loaded+')'
						: ':not(.'+collapsed+')';
				
						
				//tree.find('.'+subtree+':has(*)').prev(':not(.'+collapsed+')').addClass(collapsed)

				$.each(dirs, function(i, dir) {
					$('#'+fm.navHash2Id(dir.phash)+sel)
						.filter(function() { return $(this).next('.'+subtree).children().length > 0 })
						.addClass(cls);
				})
			},
			
			
			
			/**
			 * Navigation tree
			 *
			 * @type JQuery
			 */
			tree = $(this).addClass(treeclass)
				// make dirs draggable and toggle hover class
				.on('mouseenter mouseleave', selNavdir, function(e) {
					var link  = $(this), 
						enter = e.type == 'mouseenter';
					
					if (!link.hasClass(dropover+' '+disabled)) {
						!mobile && enter && !link.hasClass(root+' '+draggable+' elfinder-na elfinder-wo') && link.draggable(fm.draggable);
						link.toggleClass(hover, enter);
					}
				})
				// add/remove dropover css class
				.on('dropover dropout drop', selNavdir, function(e) {
					$(this)[e.type == 'dropover' ? 'addClass' : 'removeClass'](dropover+' '+hover);
				})
				// open dir or open subfolders in tree
				.on('click', selNavdir, function(e) {
					var link = $(this),
						hash = fm.navId2Hash(link.attr('id')),
						file = fm.file(hash);
					
						if (link.data('longtap')) {
							e.stopPropagation();
						return;
					}
					
					fm.trigger('searchend');
				
					if (hash != fm.cwd().hash && !link.hasClass(disabled)) {
						fm.exec('open', hash);
					} else if (link.hasClass(collapsed)) {
						link.children('.'+arrow).click();
					}
				})
				// for touch device
				.on('touchstart', selNavdir, function(e) {
					e.stopPropagation();
					var evt = e.originalEvent,
					p = $(this)
					.addClass(hover)
					.data('longtap', null)
					.data('tmlongtap', setTimeout(function(e){
						// long tap
						p.data('longtap', true);
						fm.trigger('contextmenu', {
							'type'    : 'navbar',
							'targets' : [fm.navId2Hash(p.attr('id'))],
							'x'       : evt.touches[0].clientX,
							'y'       : evt.touches[0].clientY
						});
					}, 500));
				})
				.on('touchmove touchend', selNavdir, function(e) {
					e.stopPropagation();
					clearTimeout($(this).data('tmlongtap'));
					if (e.type == 'touchmove') {
						$(this).removeClass(hover);
					}
				})
				// toggle subfolders in tree
				.on('click', selNavdir+'.'+collapsed+' .'+arrow, function(e) {
					var arrow = $(this),
						link  = arrow.parent(selNavdir),
						stree = link.next('.'+subtree);

					e.stopPropagation();

					if (link.hasClass(loaded)) {
						link.toggleClass(expanded);
						stree.slideToggle('normal', function(){
							fm.draggingUiHelper && fm.draggingUiHelper.data('refreshPositions', 1);
						});
					} else {
						spinner.insertBefore(arrow);
						link.removeClass(collapsed);

						fm.request({cmd : 'tree', target : fm.navId2Hash(link.attr('id'))})
							.done(function(data) { 
								updateTree(filter(data.tree)); 
								
								if (stree.children().length) {
									link.addClass(collapsed+' '+expanded);
									stree.slideDown('normal', function(){
										fm.draggingUiHelper && fm.draggingUiHelper.data('refreshPositions', 1);
									});
								} 
								sync(true);
							})
							.always(function(data) {
								spinner.remove();
								link.addClass(loaded);
							});
					}
				})
				.on('contextmenu', selNavdir, function(e) {
					e.preventDefault();

					fm.trigger('contextmenu', {
						'type'    : 'navbar',
						'targets' : [fm.navId2Hash($(this).attr('id'))],
						'x'       : e.clientX,
						'y'       : e.clientY
					});
				}),
			// move tree into navbar
			navbar = fm.getUI('navbar').append(tree).show()
				
			;

		fm.open(function(e) {
			var data = e.data,
				dirs = filter(data.files),
				contextmenu = fm.getUI('contextmenu');

			data.init && tree.empty();

			if (dirs.length) {
				if (!contextmenu.data('cmdMaps')) {
					contextmenu.data('cmdMaps', {});
				}
				updateTree(dirs);
				updateArrows(dirs, loaded);
				// support volume driver option `uiCmdMap`
				$.each(dirs, function(k, v){
					if (v.volumeid) {
						if (v.uiCmdMap && Object.keys(v.uiCmdMap).length && !contextmenu.data('cmdMaps')[v.volumeid]) {
							contextmenu.data('cmdMaps')[v.volumeid] = v.uiCmdMap;
						}
					}
				});
			} 
			sync(false, dirs);
		})
		// add new dirs
		.add(function(e) {
			var dirs = filter(e.data.added);

			if (dirs.length) {
				updateTree(dirs);
				updateArrows(dirs, collapsed);
			}
		})
		// update changed dirs
		.change(function(e) {
			var dirs = filter(e.data.changed),
				l    = dirs.length,
				dir, node, tmp, realParent, reqParent, realSibling, reqSibling, isExpanded, isLoaded;
			
			while (l--) {
				dir = dirs[l];
				if ((node = $('#'+fm.navHash2Id(dir.hash))).length) {
					if (dir.phash) {
						realParent  = node.closest('.'+subtree);
						reqParent   = findSubtree(dir.phash);
						realSibling = node.parent().next();
						reqSibling  = findSibling(reqParent, dir);
						
						if (!reqParent.length) {
							continue;
						}
						
						if (reqParent[0] !== realParent[0] || realSibling.get(0) !== reqSibling.get(0)) {
							reqSibling.length ? reqSibling.before(node) : reqParent.append(node);
						}
					}
					isExpanded = node.hasClass(expanded);
					isLoaded   = node.hasClass(loaded);
					tmp        = $(itemhtml(dir));
					node.replaceWith(tmp.children(selNavdir));
					
					if (dir.dirs 
					&& (isExpanded || isLoaded) 
					&& (node = $('#'+fm.navHash2Id(dir.hash))) 
					&& node.next('.'+subtree).children().length) {
						isExpanded && node.addClass(expanded);
						isLoaded && node.addClass(loaded);
					}
				}
			}

			sync();
			!mobile && updateDroppable();
		})
		// remove dirs
		.remove(function(e) {
			var dirs = e.data.removed,
				l    = dirs.length,
				node, stree;
			
			while (l--) {
				if ((node = $('#'+fm.navHash2Id(dirs[l]))).length) {
					stree = node.closest('.'+subtree);
					node.parent().detach();
					if (!stree.children().length) {
						stree.hide().prev(selNavdir).removeClass(collapsed+' '+expanded+' '+loaded);
					}
				}
			}
		})
		// add/remove active class for current dir
		.bind('search searchend', function(e) {
			$('#'+fm.navHash2Id(fm.cwd().hash))[e.type == 'search' ? 'removeClass' : 'addClass'](active);
		})
		// lock/unlock dirs while moving
		.bind('lockfiles unlockfiles', function(e) {
			var lock = e.type == 'lockfiles',
				act  = lock ? 'disable' : 'enable',
				dirs = $.map(e.data.files||[], function(h) {  
					var dir = fm.file(h);
					return dir && dir.mime == 'directory' ? h : null;
				})
				
			$.each(dirs, function(i, hash) {
				var dir = $('#'+fm.navHash2Id(hash));
				
				if (dir.length) {
					dir.hasClass(draggable) && dir.draggable(act);
					dir.hasClass(droppable) && dir.droppable(act);
					dir[lock ? 'addClass' : 'removeClass'](disabled);
				}
			});
		});

	});
	
	return this;
}
