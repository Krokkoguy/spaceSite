"use strict";
/*I work 50/50 with VS-code and Atom. Indentation is correct in editor, but not necessairily in browser*/

//https://api.nasa.gov/
window.onload = init;

/* Use ApiProxy to request cross domain and potentially cache */
/* Returns a new promise */
class ApiProxy {
    constructor( arg ){
        this.url = arg.url || arg;
        this.cache = arg.cache || false;
        this.info = arg.info || false;
        this.freshness = arg.freshness || 8;
        return this;
    }
    /* Get json from apiproxy */
    fetchJSON() {
        return fetch( this.form ).then( r => r.json() );
    }
    static fetchJSON( arg ){
        let request = new ApiProxy( arg );
        return request.fetchJSON();
    }
    /* Generate form for apiproxy to handle */
    get form(){
        return "apiproxy.php?url=" + this.url
            + ( this.cache ? "&cache=" + this.cache : ""              )
            + ( this.info ? "&info=" + JSON.stringify(this.info) : ""   )
            + ( this.freshness ? "&freshness=" + this.freshness : ""    );
    }
}

/* Use ApiProxyArray to request many ApiProxy requests */
/* Returns a new promise */
class ApiProxyArray {
    constructor ( requestArray ){
        this.requestList = requestArray;
        return this;
    }
    all( progressionCallback = ()=>{}, modifier = r => r ){

        var completion = 0;

        var promises = [];

        for ( var i = 0; i < this.requestList.length; ++i ){

            promises.push( ApiProxy.fetchJSON( this.requestList[i] )
                .then( modifier )
                .then( response => {
                    completion += 100 / this.requestList.length;
                    progressionCallback( completion );
                    return response;
                } )
            );
        }
        return Promise.all( promises );
    }
}

//////////////////////////////////////////////////////////////////
//					Initialize requests and DOM					//
//////////////////////////////////////////////////////////////////
var articles;

async function init(){

    /* Fetch the requests from json */
    var requests = await fetch("webRequests.json")
        .then( response => response.json() )
        .then( response => { return new ApiProxyArray( response ) } );

    /* The following code also works, but the native fetch function is faster */
    // var proxies = await ApiProxy("webRequests.json")
    //     .then( response => { return new ApiProxyArray( response ) } );

    articles = await requests.all( load ).then( finish );

    console.log( articles );

    main( articles );

}

function load( completion ){
    document.getElementById("loading_animation") .innerHTML = completion + "%";
}
function finish( response ){
    document.getElementById("loading").outerHTML = "";
    return response;
}

//////////////////////////////////////////////////////////////////
//                        Write articles                        //
//////////////////////////////////////////////////////////////////

function main( jsonArray ){

    var main = document.getElementsByTagName("MAIN")[0];

    for( var i = 0; i < jsonArray.length; ++i ){

        writeArticle( main, jsonArray[i], i );

    }

}

function writeArticle( location, json, id ){

    var article = document.createElement("article");

    if ( json.info.id ){
        article.id = json.info.id;
    }

    // if ( json.info.type === "latest" ){
    //     json.content = json.content[ json.content.length - 1 ];
    // }
    // else if ( json.info.type === "first" ){
    //     //json.content = json.content[ 0 ];
    // }

    //article.appendChild( jTitle( json ) );

    // let nav = jNav( article, json );
    // if ( nav ){
    //     article.appendChild( nav );
    // }
    let sections = jSections( article, json );

    if ( sections ){
        article.appendChild( sections.nav );

        sections.arr.forEach( element => {
            article.appendChild( element );
        });
    }


    // for ( var i = 0; i < sections; ++i ){

    //     jSection( article, json, i );

    // }

    //jMedia( article, json );

    //jSummary( article, json );

    //jDetails( article, json );

    //jFooter( article, json );

    location.appendChild(article);
}

function jNav( location, json ){

    /* Declare navigation */
    let navigation;

    /* If json calls for several sections, add menu-buttons */
    if ( json.info.sections && json.info.sections.length > 1 ){

        /* Create a navbar */
        navigation = document.createElement("nav");

        /* For each section in json, add a menu-button */
        for ( let i = 0; i < json.info.sections.length; ++i ){

            /* Set the name of the button to the json section name */
            let sectionName = json.info.sections[i];

            /* Add button, and the onclick event that updates the visible section */
            let menuItem = jButton( sectionName, function(){ updateVisible( location, "section", i ) })

            navigation.appendChild(menuItem);

        }
    }
    return navigation;
}

function jButton( innerHTML, handler ){
    let button = document.createElement("button");
    button.innerHTML = innerHTML;
    button.onclick = handler;
    return button;
}

function jSections( location, json ){

    /* Declare an empty array, not as a nodelist. The appending is done elsewhere */
    let arr = [];

    let navigation;

    /* If the json calls for sections, create these sections */
    if ( json.info.sections && json.info.sections.length > 1 ){

        navigation = document.createElement("nav");

        for( let i = 0; i < json.info.sections.length; ++i ){

            let sectionName = json.info.sections[i];

            /* Add button, and the onclick event that updates the visible section */
            let menuItem = jButton( sectionName, function(){ 
                updateData( location, "section", "visible", i ) 
                updateData( location, "button", "selected", i ) 
            })

            
            navigation.appendChild(menuItem);
            
            /* Instantiate a new section */
            let section = document.createElement("section");
            
            /* Add the sectionname to the classlist so it can be found by other functions */
            section.classList.add( sectionName );

            menuItem.dataset.selected = i === 0;
            section.dataset.visible = i === 0;

            /* Actual contents of section */
            section.innerHTML = "Section: " + sectionName;
            arr.push( section );

        }
        return {nav: navigation, arr: arr };
    }
   // console.log( id );
}
function updateData( location, tag, data, index ){
    
    /* Get a list of all the tags */
    let set = location.getElementsByTagName( tag );

    /* If the element matches the index, show, otherwise hide */
    for( let i = 0; i < set.length; ++i ){
        set[i].dataset[ data ] = i === index;
    }
}


function jTitle( json ){

    /* Instantiate nodes */
    let banner = document.createElement("header");
    let title = document.createElement("h2");

    /*  Extract title from json.  */
    /*  Different API responses have different structure, so if 
        none are found where expected, default to domain name  */
    let titleText = 
        json.content.title || 
        json.content.mission_name || 
        json.content.name || 
        json.content.ship_name || 
        json.info.domain;

    /*  Append title to banner */
    title.innerHTML = titleText;
    banner.appendChild( title );

    /*  Extract timestamp */
    /*  If no timestamp is given, don't add timestamp to article */
    let timeStamp = 
        json.content.date || 
        json.content.launch_date_utc || 
        json.content.event_date_utc || 
        json.content.year_built;

    if( timeStamp ){

        /* Append timestamp */
        let time = document.createElement("time");
        time.dateTime = timeStamp;

        timeUpdater( json, timeStamp, time );

        banner.appendChild( time );
    }

    return banner;
}

/*  Write summary if available  */
function jSummary( article, json ){

    var text = json.content.details || json.content.explanation;

    if ( text ){
        var summary = document.createElement("p");
        summary.innerHTML = text;
        article.appendChild( summary );
    }

}
//////////////////////////////////////
//          Media functions         //
//////////////////////////////////////

/*  Add image if available  */
function jMedia( article, json ){

    var media;
    
    /*  Extract image url(s) from json file where expected */
    var image = json.content.image || json.content.url || json.content.hdurl;
    var imageArray = json.content.flickr_images || (json.content.links ? json.content.links.flickr_images : undefined );

    /*  Check if json contains several images */
    if( imageArray && imageArray.length > 0 ){

        media = addImages("", ...imageArray);

    }
    /*  Check if a single image was found instead */
    else if ( json.content.media_type === "image" || json.content.image ){

        media = addImages( "", image );

    }

    /*  If an image was found, append media to article */
    if( media ){
        article.appendChild( media );
    }
}

function addImages( caption, ...images ){
    var figure = document.createElement("figure");

    for( var i = 0; i < images.length; ++i ){

        var image = document.createElement("img");
        image.src = images[i];
        image.alt = "";

        figure.appendChild( image );
    }

    /* Use truthy to check if caption can be added */
    if ( caption ){

        var figCaption = document.createElement("figcaption");
        figCaption.innerHTML = caption;
    
        figure.appendChild(figCaption);

    }

    return figure;
}

////////////////////////////////////////////
//            Time functions              //
////////////////////////////////////////////


function updateTime( timeStamp ){

    var date = new Date( timeDifference(timeStamp) );

    var output = "";
    var cascade = false;

    var formats = { 
        years: date.getUTCFullYear() - 1970,
        months: date.getUTCMonth(),
        days: date.getUTCDate(),
        hours: date.getUTCHours(),
        minutes: date.getUTCMinutes()
    }

    for( var key in formats ){
        if ( formats[ key ] > 0 || cascade ){
            cascade = true;
            output += formats[ key ] + " " + key + ", ";
        }
    }
    output += date.getUTCSeconds() + " seconds left";
    return output;
}

function timeDifference( from, to = Date.now() ){
    return new Date( from ) - new Date(to);
}

function initializeTime( json, timeStamp ){
    var date = new Date( timeStamp );

    /* Spaghetti date extracter :^) */
    var relevantTime = String( date.getDate() ).padStart(2,0) 
        + "/" + String( date.getMonth() ).padStart(2,0) 
        + "/" + date.getFullYear();


    return (
        json.content.launch_date_utc ? "Launched: " + relevantTime : undefined ) ||
        (json.content.year_built ? "Built in " + date.getFullYear() : undefined) ||
        "Date: " + relevantTime;
}

function timeUpdater( json, timeStamp, timeObject ){

    /* If time is in the future update time regularly */
    if( json.content.is_tentative || timeDifference( timeStamp ) > 0 ){

        /* update on initialization */
        timeObject.innerHTML = updateTime( timeStamp, "launch" );

        /* Define an updater to be called every second */
        var updater = setInterval( function(){

            /* update time */
            timeObject.innerHTML =  updateTime(timeStamp, "launch" );

            /* If the time is in the past, set time to timeStamp and cancel updater */
            if ( timeDifference( timeStamp ) <= 0 ){

                clearInterval( updater );
                timeObject.innerHTML = timeStamp;
            }
        }, 200 );
    }
    /* Time is in the past, initialize timeObject to timeStamp */
    else {
        timeObject.innerHTML = initializeTime( json, timeStamp );
    }

}