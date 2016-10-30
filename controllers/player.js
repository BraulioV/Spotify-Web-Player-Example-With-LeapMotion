(function() {

	var module = angular.module('PlayerApp');
	var eventDispatched = false;		// temporizador para leap
	var pointer = document.createElement( 'div' );	// puntero azul
	pointer.id = 'leap';
	// obtenemos todos los enlaces del documento, menos el botón verde "play all"
	var enlaces = document.documentElement.getElementsByClassName("ng-binding");
	// obtenemos el botón de play all de una playlist
	var playallbutton = document.documentElement.getElementsByClassName("button green");
	// variables para saber dónde apuntaba antes el pointer
	var old_pointer_t = 0;
	var old_pointer_l = 0;
	var cur_pointer_t = 0;
	var cur_pointer_l = 0;
	var temporizador = false;
	// función para saber la localización de un elemento
	function get_offset_parent(kind, element) {
		var local_element = element;
		var offset = 0;
		while (local_element.offsetParent != null) {
			if (kind == "left") {
				offset += local_element.offsetParent.offsetLeft;
			} else {
				offset += local_element.offsetParent.offsetTop;
			}
			local_element = local_element.offsetParent;
		}
		return offset;
	}

	module.controller('PlayerController', function($scope, $rootScope, Auth, API, PlayQueue, Playback, $location) {
		$scope.view = 'welcome';
		$scope.profileUsername = Auth.getUsername();
		$scope.playlists = [];
		$scope.playing = false;
		$scope.progress = 0;
		$scope.duration = 4000;
		$scope.trackdata = null;
		$scope.currenttrack = '';

		function updatePlaylists() {
			if ($scope.profileUsername != '') {
				API.getPlaylists(Auth.getUsername()).then(function(items) {
					$scope.playlists = items.map(function(pl) {
						return {
							id: pl.id,
							name: pl.name,
							uri: pl.uri,
							username: pl.owner.id,
							collaborative: pl.collaborative,
							'public': pl['public']
						};
					});
				});
			}
		}

		updatePlaylists();

		// subscribe to an event
		$rootScope.$on('playlistsubscriptionchange', function() {
			updatePlaylists();
		});

		$scope.logout = function() {
			// do login!
			console.log('do logout...');
			Auth.setUsername('');
			Auth.setAccessToken('', 0);
			$scope.$emit('logout');
		};

		$scope.resume = function() {
			Playback.resume();
		};

		$scope.pause = function() {
			Playback.pause();
		};

		$scope.next = function() {
			PlayQueue.next();
			Playback.startPlaying(PlayQueue.getCurrent());
		};

		$scope.prev = function() {
			PlayQueue.prev();
			Playback.startPlaying(PlayQueue.getCurrent());
		};

		$scope.queue = function(trackuri) {
			PlayQueue.enqueue(trackuri);
		};

		$scope.showhome = function() {
			console.log('load home view');
		};

		$scope.showplayqueue = function() {
			console.log('load playqueue view');
		};

		$scope.showplaylist = function(playlisturi) {
			console.log('load playlist view', playlisturi);
		};

		$scope.query = '';

		$scope.loadsearch = function() {
			console.log('search for', $scope.query);
			$location.path('/search').search({ q: $scope.query }).replace();
		};


		$scope.volume = Playback.getVolume();

		$scope.changevolume = function() {
			Playback.setVolume($scope.volume);
		};

		$scope.changeprogress = function() {
			Playback.setProgress($scope.progress);
		};

		$rootScope.$on('login', function() {
			$scope.profileUsername = Auth.getUsername();
			updatePlaylists();
		});

		$rootScope.$on('playqueuechanged', function() {
			console.log('PlayerController: play queue changed.');
			// $scope.duration = Playback.getDuration();
		});

		$rootScope.$on('playerchanged', function() {
			console.log('PlayerController: player changed.');
			$scope.currenttrack = Playback.getTrack();
			$scope.playing = Playback.isPlaying();
			$scope.trackdata = Playback.getTrackData();
		});

		$rootScope.$on('endtrack', function() {
			console.log('PlayerController: end track.');
			$scope.currenttrack = Playback.getTrack();
			$scope.trackdata = Playback.getTrackData();
			$scope.playing = Playback.isPlaying();
			PlayQueue.next();
			Playback.startPlaying(PlayQueue.getCurrent());
			$scope.duration = Playback.getDuration();
		});

		$rootScope.$on('trackprogress', function() {
			console.log('PlayerController: trackprogress.');
			$scope.progress = Playback.getProgress();
			$scope.duration = Playback.getDuration();
		});


		var controller = Leap.loop({enableGestures: true}, function(frame) {
			// cuando señalemos en la pantalla, se dibujará un círculo. 
			// Inspirado en https://github.com/hakimel/reveal.js/blob/flexbox/plugin/leap/leap.js
			pointer.style.position        = 'absolute';
			pointer.style.visibility      = 'hidden';
			pointer.style.zIndex          = 50;
			pointer.style.opacity         = 0.7;
			pointer.style.backgroundColor = '#00aaff';
			var body = document.body;

			body.appendChild( pointer );
			if(frame.valid && frame.gestures.length > 0){
				frame.gestures.forEach(function(gesture) {
					switch (gesture.type){
						case "keyTap":
							if (Playback.isPlaying()) {
								Playback.pause();
							} else {
								Playback.resume();
							}
						break;
						case "swipe":
							//Classify swipe as either horizontal or vertical
							var isHorizontal = Math.abs(gesture.direction[0]) > Math.abs(gesture.direction[1]);
							//Classify as right-left
							if(isHorizontal && !eventDispatched){
								eventDispatched = true
								if(gesture.direction[0] > 0){
									PlayQueue.next();
									Playback.startPlaying(PlayQueue.getCurrent());
								} else {
									PlayQueue.prev();
									Playback.startPlaying(PlayQueue.getCurrent());
								}
							}
							window.setTimeout(function() {
                        		eventDispatched = false;
							}, 500);
						break;
						case "circle":
							var pointableID = gesture.pointableIds[0];
							var direction = frame.pointable(pointableID).direction;
							var volume = Playback.getVolume();
							// Check if the circle is clockwise or not
							if (Leap.vec3.dot(direction, gesture.normal) > 0){ //Clockwise
								var volumen = volume*1.05;
								console.log(volumen)
								if (volumen < 100) {
									Playback.setVolume(volume*1.05);
								}
							} 
							else{
								Playback.setVolume(volume*0.95)
							}
						case "screenTap":
							console.log("screen tap");
							// una vez tenemos todos los enlaces, vemos en cuál ha hecho click el usuario.
							// Para ello, nos basaremos en la posición del screen tap y en los atributos
							// offsetLeft y offsetTop de cada enlace
							
							// // obtenemos el dedo con el que hemos hecho screen tap
							// function has_same_id(dedo) {
							// 	return dedo.id == gesture.pointableIds[0];
							// }
							// var dedo = frame.fingers.filter(has_same_id)[0];

							// // calculamos la posición del screen tap sobre la pantalla
							// var pos_top = (1 - ((dedo.tipPosition[1] - 50) / 120)) * body.offsetHeight;
							// var pos_left = (dedo.tipPosition[0] * body.offsetWidth / 120) + (body.offsetWidth / 2);

							// console.log("dedo")
							// console.log(pos_top);
							// console.log(pos_left);
							// console.log("botón")
							// console.log(offset_t);
							// console.log(offset_l);

						break;
					}

				});
			}
			// var hand = frame.hands[0];
			// if ((hand.grabStrength == 1 || hand.grabStrength >= 0.9) &&
			// 	Playback.getVolume() != 0) {
			// 	Playback.setLastVolume();
			// 	Playback.setVolume(0);
			// } else {
			// 	if((hand.grabStrength == 0 || hand.grabStrength <= 0.1) &&
			// 	Playback.getVolume() == 0){
			// 		Playback.setVolume(Playback.getLastVolume());
			// 	}
			// }
			// señalar con el dedo
			if (frame.valid && frame.fingers.length > 0) {
				frame.fingers.forEach(function(finger) {
					var size = -3 * finger.tipPosition[2];
					pointer.style.width        = size     + 'px';
					pointer.style.height       = size     + 'px';
					pointer.style.borderRadius = size - 5 + 'px';

					if (finger.extended) {
						if (!temporizador) {
							temporizador = true;
							pointer.style.visibility   = 'visible';
							cur_pointer_t  = ( 1 - (( finger.tipPosition[1] - 50) / 120 )) *
			          		body.offsetHeight;
			          		pointer.style.top = cur_pointer_t + 'px';

			        		cur_pointer_l = ( finger.tipPosition[0] * body.offsetWidth / 120 ) +
							( body.offsetWidth / 2 );
							pointer.style.left = cur_pointer_l + 'px';

							old_pointer_l = cur_pointer_l;
							old_pointer_t = cur_pointer_t;
						} else {
							pointer.style.visibility   = 'visible';
							cur_pointer_t  = ( 1 - (( finger.tipPosition[1] - 50) / 120 )) *
			          		body.offsetHeight;
			          		pointer.style.top = cur_pointer_t + 'px';

			        		cur_pointer_l = ( finger.tipPosition[0] * body.offsetWidth / 120 ) +
							( body.offsetWidth / 2 );
							pointer.style.left = cur_pointer_l + 'px';

							if (Math.abs(cur_pointer_t - old_pointer_t) <= 20 &&
								Math.abs(cur_pointer_l - old_pointer_l) <= 20) {
								console.log("yay");
								var offset_l = get_offset_parent("left", playallbutton[0]);
								var offset_t = get_offset_parent("top", playallbutton[0]);
								console.log("offset_l = ", offset_l);
								console.log("offset_t = ", offset_t);
								console.log("cur_pointer_l = ", cur_pointer_l);
								console.log("cur_pointer_t = ", cur_pointer_t)
								if (Math.abs(cur_pointer_t - offset_t) <= 50) {
									console.log("click");
									playallbutton[0].click();
								}
							} else {
								console.log("nay");
							}
						}
						window.setTimeout(function() {
							temporizador = false;
						}, 4000);
					}
				});
			} else {
				pointer.style.visibility   = 'hidden';
			}
        });
	});

})();
