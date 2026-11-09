jQuery( function ( $ ) {

	function openOverlay() {

		$( '.honeydew-search-overlay').addClass( 'is-open' );
		$( 'body' ).addClass( 'honeydew-search-overlay-open' );

	}

	function closeOverlay() {

		$( '.honeydew-search-overlay' ).removeClass( 'is-open' );
		$( 'body' ).removeClass( 'honeydew-search-overlay-open' );

	}

	$( '.honeydew-search-overlay-toggle' ).on( 'click', function(e) {

		e.preventDefault();

		openOverlay();

		$( '.honeydew-search-overlay .search-form input[type="search"]' )[0].focus();

	});

	$( document ).keyup( function(e) {

	    if ( e.key === 'Escape' ) { // escape key maps to keycode `27`

			closeOverlay();

	    }

	});

	$( '.honeydew-close-overlay' ).on('click', function(e) {

		e.preventDefault();

		closeOverlay();

	});

});