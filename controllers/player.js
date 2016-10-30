(function() {

	var module = angular.module('PlayerApp');
	var eventDispatched = false;		// temporizador para leapç
	var pointer = document.createElement( 'div' );
	pointer.id = 'leap';
	var body = document.body;

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
							}, 300);
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
							console.log("Screen Tap Gesture");
						break;
					}
				});
			}
			// señalar con el dedo
			if (frame.valid && frame.fingers.length > 0) {
				frame.fingers.forEach(function(finger) {
					console.log('dedo')
					var size = -3 * finger.tipPosition[2];
					pointer.style.width        = size     + 'px';
					pointer.style.height       = size     + 'px';
					pointer.style.borderRadius = size - 5 + 'px';

					if (finger.extended) {
						pointer.style.visibility   = 'visible';
						pointer.style.top  = ( 1 - (( finger.tipPosition[1] - 50) / 120 )) *
		          		body.offsetHeight + 'px';

		        		pointer.style.left = ( finger.tipPosition[0] * body.offsetWidth / 120 ) +
						( body.offsetWidth / 2 ) + 'px';
					}
				});
			} else {
				pointer.style.visibility   = 'hidden';
			}
        });
	});

})();
