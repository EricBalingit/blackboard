var express = require ( 'express' ),
    path = require ( 'path' ),
	fmt = require ( 'util' ).format,
	app = express (),
	router = express.Router (),
	server = require ( 'http' ).Server ( app ),
	io = require ( 'socket.io' ) ( server ),
	users = {},
	id = 0;

app.set ( 'views', path.join ( __dirname, 'views' ) );
app.set ( 'view engine', 'pug' );

router.get ( '/', function ( req, res, next ) {
    res.render ( 'page', {}, function ( err, html ) {
        if ( err ) {
            console.error ( err );
            res.send ( err.message );
        } else {
            res.send ( html );
        }
    } );
} );

io.on ( 'connection', function ( socket ) {
    
    socket.on ( 'join', function ( user, callback ) {
        var userId = id++;
        
        user.id = userId;
        socket.broadcast.emit ( 'join', user );
        
        socket.emit ( 'sync', users );
        
        users [ userId ] = user;
        
        socket.broadcast.emit ( 'chat', 'BLACKBOARD', user.name + ' joined the blackboard session.' );
        
        callback ( null, userId );
    } );
    
    socket.on ( 'leave', function ( userId ) {
        
        socket.broadcast.emit ( 'leave', userId );
        delete users [ userId ];
    } );
    
    socket.on ( 'begin-plot',  function ( userId, plot ) {
        
        users [ userId ].currentPlot = plot;
        
        socket.broadcast.emit ( 'begin-plot', userId, plot );
    } );
    
    socket.on ( 'update-plot', function ( userId, data ) {
        
        users [ userId ].currentPlot.data.concat ( data );
        
        socket.broadcast.emit ( 'update-plot', userId, data );
    } );
    
    socket.on ( 'end-plot', function ( userId, data ) {
        
        users [ userId ].currentPlot = null;
        
        socket.broadcast.emit ( 'end-plot', userId, data );
    } );
    
    socket.on ( 'update-user', function ( userId, mouseX, mouseY ) {
        var user = users [ userId ];

        user.mouseX = mouseX;
        user.mouseY = mouseY;
        
        socket.broadcast.emit ( 'update-user', userId, mouseX, mouseY );
    } );
    
    socket.on ( 'change-color', function ( userId, color ) {
        
        users [ userId ].color = color;
        
        socket.broadcast.emit ( 'change-color', userId, color );
    } );
    
    socket.on ( 'change-line', function ( userId, lineWidth ) {
        
        users [ userId ].lineWidth = lineWidth;
        
        socket.broadcast.emit ( 'change-line', userId, lineWidth );
    } );
    
    socket.on ( 'chat', function ( userId, message, callback ) {
        
        socket.broadcast.emit ( 'chat', { id: userId, message: message } );
        
        callback ();
    } );
} );

app.use ( router );

app.use ( express.static ( path.join ( __dirname, 'public' ), { redirect : false } ) );

console.log ( 'starting server!' );
var port = process.env.PORT || 8080,
	addr = process.env.IP || "0.0.0.0";
try {
	server.listen( port, addr, function () {
		console.log ( 'server ready!' );
		console.log ( fmt ( 'application server running at %s:%s', addr, port ) );
	} );
} catch ( e ) {
	console.warn ( fmt ( 'Server may already be running at %s:%s', addr, port ) );
	console.log ( 'Try visiting https://eon-team-signin-ericbalingit.c9users.io' );
	console.error ( e );
}