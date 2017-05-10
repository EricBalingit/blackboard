/* global io, $ */
( function ( undef ) {
    var window = this,
        document = window.document,
        socket = io(),
        $ui = {
            "id": {},
            "class": {}
        },
        
        username,
        usercolor = 'rgb(127,127,127)',
        mouseX, mouseY,
        pmouseX, pmouseY,
        drawing = false,
        lineWidth = 1,
        
        canvasBounds,
        canvasWidth,
        canvasHeight,
        
        outputContext,
        inputContext,
        
        currentPlot,
        users = {},
        me;
    
    function User () {
        return {
            name: username,
            color: usercolor,
            lineWidth: lineWidth,
            mouseX: mouseX,
            mouseY: mouseY
        };
    }
    
    function Plot () {
        return {
            data: [],
            length: 0,
        };
    }
    
    // prompt for user name
    $ ( document ).ready ( function ( e ) {
        while ( ( username = window.prompt ( 'Please enter your username for this session. ( you may not choose "BLACKBOARD" )', '' ) ) === 'BLACKBOARD' || username.toLowerCase () === 'you' || !username ) {
            if ( !username ) {
                alert ( 'You must pick a username.' );
            } else {
                if ( username === 'BLACKBOARD' ) {
                    alert ( 'The name "BLACKBOARD" is reserved for messages from the server.' );
                } else {
                    alert ( 'The name "You" is reserved for the person sending the message.' );
                }
            }
        }
        
        me = new User ();
        
        socket.emit ( 'join', me, function ( err, id ) {
            if ( err ) {
                console.log ( err );
            } else {
                me.id = id;
                
                // 60fps
                drawLoop ();
                
                // 8fps
                window.setInterval ( function () {
                    updatePlot ();
                    updateUser ();
                }, 125 );
            }
        } );
    } );
    
    // clobber named elements
    $ ( '[id]' ).each ( function ( i, e ) {
        var name = e.getAttribute ( 'id' );
        
        name = name.split ( '-' ).map ( function ( e, i ) {
            return i===0 ? e : ( e [0] ).toUpperCase () + e.slice ( 1 );
        } ).join ( '' );
        
        $ui.id [ name ] = $ ( e );
    } );
    
    outputContext = $ui.id.outputCanvas [ 0 ].getContext ( '2d' );
    inputContext = $ui.id.inputCanvas [ 0 ].getContext ( '2d' );
    
    for ( var i = 0; i < 32; i = i + 1 ) {
        $ui.id.palette.append ( '<div>' );
    }
    
    function sizePalette () {
        canvasBounds = $ui.id.outputCanvas [ 0 ].getBoundingClientRect ();
        canvasWidth = canvasBounds.right - canvasBounds.left;
        canvasHeight = canvasBounds.bottom - canvasBounds.top;
        
        $ui.id.outputCanvas.attr ( { width: canvasWidth, height: canvasHeight } );
        $ui.id.inputCanvas.attr ( { width: canvasWidth, height: canvasHeight } );
        
        inputContext.textBaseline = 'alphabetic';
        inputContext.font = '1em sans-serif';
        
        var paletteBounds = $ui.id.palette [ 0 ].getBoundingClientRect ();
        var w = ( paletteBounds.right - paletteBounds.left ) / 16,
            h = ( paletteBounds.bottom - paletteBounds.top ) / 2;
        
        $ui.id.palette.find ( 'div' ).each ( function ( i, e ) {
            var div = $ ( e ),
                r = ( ( i & 4 ) >>> 2 ) * ( ( i >> 3 ) + 1 ) * 63.75 | 0,
                g = ( ( i & 2 ) >>> 1 ) * ( ( i >> 3 ) + 1 ) * 63.75 | 0,
                b = ( ( i & 1 ) >>> 0 ) * ( ( i >> 3 ) + 1 ) * 63.75 | 0,
                color = `rgb(${r},${g},${b})`;
            
            div.css ( {
                width: w,
                height: h,
                position: 'absolute',
                'background-color': color,
                top: h * ( ( i & 16 ) >> 4 ),
                left: w * ( ( ( i & 8 ) >> 3 ) * 8 + ( i & 7 ) )
            } );
        } );
        
        // debug
        console.log ( 'palette resized' );
    }
    
    
    function beginPlot () {
        drawing = true;
        me.currentPlot = currentPlot = new Plot ();
        currentPlot.data.push ( mouseX, mouseY );
        
        socket.emit ( 'begin-plot', me.id, currentPlot );
    }
    
    function updatePlot () {
        if ( currentPlot ){
            if ( currentPlot.data.length > currentPlot.length ) {
                socket.emit ( 'update-plot', me.id, currentPlot.data.slice ( currentPlot.length ) );
            }
            
            currentPlot.length = currentPlot.data.length;
        }
    }
    
    function updateUser () {
        if ( ( mouseX !== pmouseX ) || ( mouseY !== pmouseY ) ) {
            socket.emit ( 'update-user', me.id, mouseX, mouseY );
        }
        
        pmouseX = mouseX;
        pmouseY = mouseY;
    }
    
    function endPlot () {
        
        drawing = false;
        
        if ( currentPlot ) {
            socket.emit ( 'end-plot', me.id, currentPlot.data.slice ( currentPlot.length ) );
        }
        
        renderUserPlot ( me, outputContext );
        
        //console.log ( outputContext );
        
        me.currentPlot = currentPlot = null;
    }
    
    function renderUserPlot ( user, ctx ) {
        var plot = user.currentPlot,
            userLine = user.lineWidth,
            data;
        
        if ( plot ) {
            ctx.strokeStyle = ctx.fillStyle = user.color;
            ctx.lineWidth = userLine;
            
            data = plot.data;
            
            var offset = ( 0.5 * userLine ) - ( userLine >>> 1 );
            
            ctx.beginPath ();
            
            ctx.moveTo ( data [ 0 ] + offset, data [ 1 ] + offset );
            
            for ( var i = 2, l = data.length; i < l; i = i + 2 ) {
                ctx.lineTo ( data [ i + 0 ], data [ i + 1 ] );
            }
            
            ctx.stroke ();
        }
    }
    
    function renderUser ( user ) {
        inputContext.strokeStyle = inputContext.fillStyle = user.color;
        
        inputContext.beginPath ();
        inputContext.arc ( user.mouseX, user.mouseY, 0.5 * user.lineWidth, 0, 2 * Math.PI );
        inputContext.fill ();
        
        inputContext.fillText ( user.name, user.mouseX + 8, user.mouseY - 8 );
    }
    
    // 60fps
    function drawLoop () {
        if ( drawing ) {
            var data = currentPlot.data;
            
            if ( mouseX !== data [ data.length - 2 ] || mouseY !== data [ data.length - 1 ] ) {
                currentPlot.data.push ( mouseX, mouseY );
            }
        }
        
        me.mouseX = mouseX;
        me.mouseY = mouseY;
        
        inputContext.clearRect ( 0, 0, canvasWidth, canvasHeight );
        
        for ( var id in users ) {
            renderUserPlot ( users [ id ], inputContext );
            renderUser ( users [ id ] );
        }
        
        renderUserPlot ( me, inputContext );
        renderUser ( me );
        
        window.requestAnimationFrame ( drawLoop );
    }
    
    function normalizeEvent ( type ) {
        return function ( e ) {
            // stop touch event
            e.stopPropagation();
            e.preventDefault();
            
            // translate to mouse event
            var mouseEvent = document.createEvent ( 'MouseEvent' );
            mouseEvent.initMouseEvent (
                type, true, true, window, e.detail, 
                e.touches[0].screenX, e.touches[0].screenY,
                e.touches[0].clientX, e.touches[0].clientY, 
                false, false, false, false, 
                0, null
            );
            
            e.target.dispatchEvent ( mouseEvent );
        };
    }
    
    [
        [ 'touchstart', 'mousedown' ],
        [ 'touchmove', 'mousemove' ],
        [ 'touchend', 'mouseup' ]
    ].forEach ( function ( type, i ) {
        $ui.id.inputCanvas.on ( type [ 0 ], normalizeEvent ( type [ 1 ] ) );
    } );
    
    $ui.id.inputCanvas.on ( 'mousedown', function ( e ) {
        beginPlot ();
    } );
    
    // 1000fps
    $ui.id.inputCanvas [ 0 ].addEventListener ( 'mousemove', function ( e ) {
        mouseX = ( e.clientX - canvasBounds.left ) | 0;
        mouseY = ( e.clientY - canvasBounds.top ) | 0;
    } );
    
    $ui.id.inputCanvas.on ( 'mouseup mouseleave', function ( e ) {
        endPlot ();
    } );
    
    $ ( window ).on ( 'blur', function ( e ) {
        endPlot ();
    } );
    
    $ ( window ).on ( 'beforeunload', function ( e ) {
        socket.emit ( 'leave', me.id );
    } );
    
    
    $ui.id.layout.on ( 'resize', sizePalette );
    
    sizePalette ();
    
    $ui.id.palette.on ( 'click', 'div', function ( e ) {
        me.color = usercolor = $ ( this ).css ( 'background-color' );
        
        socket.emit ( 'change-color', me.id, usercolor );
    } );
    
    $ui.id.chatInput.on ( 'keydown', function ( e ) {
        if ( e.which === 13 && ( event.ctrlKey || event.metaKey ) ) {
            $ui.id.userSubmit.trigger ( 'click' );
        }
    } );
    
    $ui.id.userSubmit.on ( 'click', function ( e ) {
        var text =  $ui.id.chatInput.val ();
        if ( text ) {
            socket.emit ( 'message', me.id, text, function ( err ) {
                if ( err ) {
                    console.log ( err );
                }
                
                $ui.id.chatContent.append ( `<div class='post'><p>You: ${text}</p></div>` );
            } );
        }
    } );
    
    socket.on ( 'sync', function ( userMap ) {
        users = userMap;
    } );
    
    socket.on ( 'join', function ( user ) {
        users [ user.id ] = user;
    } );
    
    socket.on ( 'leave', function ( userId ) {
        
        $ui.id.chatContent.append ( `<div class='post'><p>BLACKBOARD: ${users [ userId ].name} left the session.</p></div>` );
        
        delete users [ userId ];
    } );
    
    socket.on ( 'begin-plot',  function ( userId, plot ) {
        users [ userId ].currentPlot = plot;
    } );
    
    socket.on ( 'update-plot', function ( userId, data ) {
        Array.prototype.push.apply ( users [ userId ].currentPlot.data, data );
    } );
    
    socket.on ( 'end-plot', function ( userId, data ) {
        var user = users [ userId ];
        
        user.currentPlot.data.concat ( data );
        renderUserPlot ( user, outputContext );
        
        user.currentPlot = null;
    } );
    
    socket.on ( 'update-user', function ( userId, mouseX, mouseY ) {
        var user = users [ userId ];
        user.mouseX = mouseX;
        user.mouseY = mouseY;
        
    } );
    
    socket.on ( 'change-color', function ( userId, color ) {
        users [ userId ].color = color;
    } );
    
    socket.on ( 'change-line', function ( userId, lineWidth ) {
        users [ userId ].lineWidth = lineWidth;
    } );
    
    socket.on ( 'chat', function ( user, message ) {
        if ( message ) {
            $ui.id.chatContent.append ( `<div class='post'><p>${user}: ${message}</p></div>` );
        } else {
            $ui.id.chatContent.append ( `<div class='post'><p>${users [ user.id ].name}: ${user.message}</p></div>` );
        }
    } );
    
} ) ();