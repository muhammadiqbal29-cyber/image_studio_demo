jQuery(function( $ ){
	
    $('.slider').slick({
		centerMode: true,
		centerPadding: '60',
		slidesToShow: 3,
		slidesToScroll: 3,
		speed:1100,
		index: 2,
		infinite: true,
		dots: false,
		responsive: [
			{
			    breakpoint: 860,
			    settings: {
			    	slidesToShow: 1,
			    	slidesToScroll: 1,
			    	mobileFirst:true,
		    }
		}]
	});  		
});

(function($) {
  // Make sure JS class is added.
  document.documentElement.className = "js";
  // Run on page scroll.
  $(window).scroll( function() {
  
  // Toggle header class after threshold point.
    if ( $(this).scrollTop() > 100 ) {
      $(".top-btn").addClass('sticky');
    } else {
      $(".top-btn").removeClass('sticky');
    }
  });
  
  $('.top-btn').click(function() {      // When arrow is clicked
    $('body,html').animate({
        scrollTop : 0                       // Scroll to top of body
    }, 500);
});
})(jQuery);


jQuery(function(t) {
            t(".entry,.wp-block-embed__wrapper,.widget-wrap").fitVids();
        })

/*!
* FitVids 1.1
*
* Copyright 2013, Chris Coyier - http://css-tricks.com + Dave Rupert - http://daverupert.com
* Credit to Thierry Koblentz - http://www.alistapart.com/articles/creating-intrinsic-ratios-for-video/
* Released under the WTFPL license - http://sam.zoy.org/wtfpl/
*
*/
;(function( $ ) {

	'use strict';

	$.fn.fitVids = function( options ) {
		var settings = {
			customSelector: null,
			ignore: null
		};

		if ( ! document.getElementById( 'fit-vids-style' ) ) {
			// appendStyles: https://github.com/toddmotto/fluidvids/blob/master/dist/fluidvids.js
			var head = document.head || document.getElementsByTagName( 'head' )[0];
			var css = '.fluid-width-video-wrapper{width:100%;position:relative;padding:0;}.fluid-width-video-wrapper iframe,.fluid-width-video-wrapper object,.fluid-width-video-wrapper embed {position:absolute;top:0;left:0;width:100%;height:100%;}';
			var div = document.createElement( 'div' );
			div.innerHTML = '<p>x</p><style id="fit-vids-style">' + css + '</style>';
			head.appendChild( div.childNodes[1] );
		}

		if ( options ) {
			$.extend( settings, options );
		}

		return this.each(function() {
			var selectors = [
				'iframe[src*="player.vimeo.com"]',
				'iframe[src*="youtube.com"]',
				'iframe[src*="youtube-nocookie.com"]',
				'iframe[src*="kickstarter.com"][src*="video.html"]',
				'object',
				'embed'
			];

			if ( settings.customSelector ) {
				selectors.push( settings.customSelector );
			}

			var ignoreList = '.fitvidsignore';

			if ( settings.ignore ) {
				ignoreList = ignoreList + ', ' + settings.ignore;
			}

			var $allVideos = $( this ).find( selectors.join( ',' ) );
			$allVideos = $allVideos.not( 'object object' ); // SwfObj conflict patch
			$allVideos = $allVideos.not( ignoreList ); // Disable FitVids on this video.

			$allVideos.each(function( count ) {
				var $this = $( this );
				if ( $this.parents( ignoreList ).length > 0 ) {
					return; // Disable FitVids on this video.
				}
				if ( this.tagName.toLowerCase() === 'embed' && $this.parent( 'object' ).length || $this.parent( '.fluid-width-video-wrapper' ).length ) {
					return;
				}
				if ( ( ! $this.css( 'height' ) && ! $this.css( 'width' ) ) && ( isNaN( $this.attr( 'height' ) ) || isNaN( $this.attr( 'width' ) ) ) ) {
					$this.attr( 'height', 9 );
					$this.attr( 'width', 16 );
				}
				var height = ( this.tagName.toLowerCase() === 'object' || ( $this.attr( 'height' ) && ! isNaN( parseInt( $this.attr( 'height' ), 10 ) ) ) ) ? parseInt( $this.attr( 'height' ), 10 ) : $this.height(),
					width = ! isNaN( parseInt( $this.attr( 'width' ), 10 ) ) ? parseInt( $this.attr( 'width' ), 10 ) : $this.width(),
					aspectRatio = height / width;
				if ( ! $this.attr( 'id' ) ) {
					var videoID = 'fitvid' + count;
					$this.attr( 'id', videoID );
				}
				$this.wrap( '<div class="fluid-width-video-wrapper"></div>' ).parent( '.fluid-width-video-wrapper' ).css( 'padding-top', ( aspectRatio * 100 ) + '%' );
				$this.removeAttr( 'height' ).removeAttr( 'width' );
			});
		});
	};
})( window.jQuery || window.Zepto );


jQuery( function ( $ ) {

	// Select all links with hashes
	$('a[href*="#"]')
  		// Remove links that don't actually link to anything
  		.not('[href="#"]')
  		.not('[href="#0"]')
  		.click(function(event) {
	    	// On-page links
	    	if (
	      		location.pathname.replace(/^\//, '') == this.pathname.replace(/^\//, '')
	      		&&
	      		location.hostname == this.hostname
	    	) {
		      	// Figure out element to scroll to
		      	var target = $(this.hash);
		      	target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');
		      	// Does a scroll target exist?
		      	if (target.length) {
		        	// Only prevent default if animation is actually gonna happen
		        	event.preventDefault();
		        	$('html, body').animate({
		          		scrollTop: target.offset().top - 120
		        	}, 1000, function() {
		          	// Callback after animation
		          	// Must change focus!
		          	var $target = $(target);
		          	$target.focus();
		          	if ($target.is(":focus")) { // Checking if the target was focused
		            	return false;
		          	} else {
		            	$target.attr('tabindex','-1'); // Adding tabindex for elements not focusable
		            	$target.focus(); // Set focus again
		          	};
		        });
		    }
	    }
  });

});

jQuery( function ( $ ) {
	$(document).on("scroll", function(){
		if
      ($(document).scrollTop() > 1){
		  $(".site-header.is-sticky").addClass("shrink");
		}
		else
		{
			$(".site-header.is-sticky").removeClass("shrink");
		}
	});
})
