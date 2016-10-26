/* Leap Motion loop */
Leap.loop({enableGestures: true}, function(frame) {
    // console.log('Frame' + frame);
    // console.log('Hola')
    // if (frame.fingers && frame.fingers.length > 0 ) {
    //  for (var i = 0; i < frame.fingers.length; i++) {
    //      var finger = frame.fingers[i];
    //      console.log('Finger' + finger);
    //  }
    // }
    
    if (frame.gestures) {
        for (var i = 0; i < frame.gestures.length; i++) {
            console.log('Type' + frame.gestures[i].type)
            if (frame.gestures[i].type == 'swipe') {
                PlayerApp.PlayQueue.play()
            }
        }
    }
});
