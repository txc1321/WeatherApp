//global array variables to set to the app on init
let forecasts = [];
let locations = [];

/* I decided to use Vue as a templating language as I knew most of the data on the page would be changing frequently
 * This would let me set multiple DOM values dynamically and allow me to control what the app rendered at what point
 * It also makes iterative rendering, the v-for elements, much easier than vanilla Javascript
 */
let app = new Vue({
    el: '#app',
    data:{
        //empty/default data attributes
        gradient: '',
        showForm: false,
        showList: false,
        showMenu: false,
        contentReady: false,
        locations: locations,
        stored_locations: [],
        location: {},
        todays_weather: {
            dateTime: {},
            wind: {},
        },
        five_day: [],
    },
	methods:{
            //function to toggle the render for the search bar list and then call the search function
            handleInput(){
                if(!app.showList){
                    //show the dropdown
                    app.showList = true;
                }
                app.search();
            },
            //function to send the api request for searching for a location
            search(){
                //reset the locations array
                locations.splice(0, locations.length);
                const input = document.querySelector('#location_search');
                //due to the api not implementing CORS functionality, I am using an existing proxy server to send the appropriate headers. This is not a production solution. In that case a custom proxy server would be needed to route requests appropriately. I feel that creating and hosting my own proxy server is beyond the scope of this assignment as to why I opted to use a pre-existing one.
                //begin making the request url
                let url = "https://pure-plains-13901.herokuapp.com/metaweather.com/api/location/search/?";
                //determine if the request is a latlng or string type based on the first element from the input
                if(Number.isInteger(parseInt(input.value[0]))){
                    url += "lattlong=";
                }
                else{
                    url += "query=";
                }
                
                if(input.value !== ""){
                    //call fetch when the input isn't empty to avoid FORBIDDEN errors
                    const response = fetch(url + input.value)
                    .then(response => {
                        if(!response.ok){
                            //XHR error catch
                            throw Error(`ERROR: ${response.statusText}`);
                        }
                        return response.json();
                    })
                    .then(json => {	
                        //iterate through the received json and add each element to the app's array so the DOM can access it
                        for(let i = 0; i < json.length; i++){
                            locations.push(json[i]);
                        }
                    });
                }
               },// end search
                //function to handle selecting an element in the menu or the search drop down
                handleLocation(loc){
                    //hide the menu
                    app.showMenu = false;
                    //check for duplicate objects
                    if(!app.stored_locations.some((e) => e.woeid === loc.woeid)){
                        app.stored_locations.push({'title': loc.title, 'woeid': loc.woeid});
                    }
                    //set the app location
                    app.location = loc;
                    app.getForecast(loc.woeid);
                },
                //function to send the api request for the forecast using a woeid
                getForecast(id){
                    //reset the forecast array
                    forecasts.splice(0, forecasts.length);
                    /* Creates a new local date object for calcing the date and time
                     * Currently this defaults to the user's local time but combined with another API to convert latlng coords to a timezone
                     * this could be offset based on the location selected, not the current location. The MetaWeather API sends latlng coords 
                     * in the JSON after a location query, these can be used to determine the latlng when sent to an additional API
                     */
                    const local_date = new Date();
                    //formatting options for the date parsing
                    const date_options = {
                        weekday: 'long',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                    };
                    
                    //hide the dropdown lost
                    if(app.showList){
                        app.showList = false;
                    }
                    //hide the input
                    app.showForm = false;
                    
                    //send the forecast fetch request
                    fetch(`https://pure-plains-13901.herokuapp.com/metaweather.com/api/location/${id}`)
                    .then(response => {
                        if(!response.ok){
                            throw Error(`ERROR: ${response.statusText}`);
                        }
                        return response.json();
                    })
                    .then(json => {
                        for(let i = 0; i < json.consolidated_weather.length; i++){
                            //create a new object to assign the relevant data to
                            let weather = {
                                weather_state: json.consolidated_weather[i].weather_state_name,
                                /* I am very proud of the following 5 lines. Within 5 lines the program will:
                                 * - Create a new DateTimeFormat object
                                 * - Chop the DateTimeFormat object up into its components in array form
                                 * - Filter out any literal components
                                 * - Turn the array of components into an object
                                 * - Get an array of the object entries
                                 * - Re-map the new array with relevant key values
                                        Using the spread syntax (...) the object created has key values like an array index (0, 1, 2, etc)
                                 * - Create a new object from this new array which is then set to the corresponding parent object property
                                 */
                                dateTime: Object.fromEntries(Object.entries({ ...new Intl.DateTimeFormat('en-US', date_options)
                                            .formatToParts(new Date(json.consolidated_weather[i].applicable_date + " " + local_date.getHours() + ":" + local_date.getMinutes()))
                                            .filter((d, i) => { return (i+1)%2 !== 0; })})
                                            .map(([k, v]) => [v.type, v.value])),
                                temp: Math.round(json.consolidated_weather[i].the_temp),
                                min_temp: Math.round(json.consolidated_weather[i].min_temp),
                                max_temp: Math.round(json.consolidated_weather[i].max_temp),
                                //rounding is used to get whole numbers except here, where 2 decimal points are added on
                                air_pressure: Math.round((json.consolidated_weather[i].air_pressure*100)/100),
                                humidity: Math.round(json.consolidated_weather[i].humidity),
                                visibility: Math.round(json.consolidated_weather[i].visibility),
                                wind: {
                                    //creates a wind object to hold its own properties
                                    direction: json.consolidated_weather[i].wind_direction_compass,
                                    //currently the app uses the direction from the API and does not convert it to english directions
                                    speed: Math.round(json.consolidated_weather[i].wind_speed),
                                },
                            };
                            forecasts.push(weather);
                        }
                        
                        //set todays_weather from the first forecast received, which will always be the present day one
                        app.todays_weather = forecasts[0];
                        //shift the array to cut out the first forecast
                        forecasts.shift();
                        //copy the array values to the app's five_day array so the DOM can access it cleanly
                        app.five_day = [...forecasts];
                        
                        /* I cheated here a bit, you aren't supposed to edit the DOM directly with a thing like vue
                         * But trying to get the background image to play nice syntactly was not working so I had to bend the rules a bit
                         * to make it work.
                         *
                         * BUG - Currently, background images are not rendering on mobile devices. Using the chrome virtual mobile device I can check that the background will render responsively. But I am missing some CSS to render the images properly. Ideally, there would be multiple sets of the images at varying resolutions (I think that is the issue with why they won't display). I left the media assets alone though, unsure if it was within the paramters of the test to make more.
                         */
                        const appDOM = document.querySelector("#app");
                        //appDOM.style.backgroundImage = "url('/" + app.gradientUrl() + "')";
                        appDOM.style.backgroundImage = `url('https://people.rit.edu/txc1321/WeatherApp/${app.gradientUrl()}')`;
                        //toggle on the DOM content
                        app.contentReady=true;
                    });//end getForecast
                },
                //function to determine which icon image to use based on weather and time data
                imageUrl: (weather_state, time, main) => {
                    //convert time to a 24 type
                    let twentyFour_hour = parseInt(time.hour);
                    //adjust hour count
                    if(time.dayPeriod === "PM")
                        twentyFour_hour = twentyFour_hour + 12;
                    
                    let url = "media/icons/";
                    if(main){
                        //checks if the weather has any night options available to it based on its state
                        if(weather_state === "Clear" || weather_state === "Heavy Cloud" || weather_state === "Rain"){
                            if(twentyFour_hour >= 19 || twentyFour_hour <= 6){
                                //appends Night to the url string to grab the appropriate image
                                url = url + "Night ";
                            }
                        }
                    }
                    
                    return url + `${weather_state}.png`;
                },
                //function to grab the gradient url based on weather and time data
                gradientUrl: () => {
                    //grabs app variables
                    const weather_state = app.todays_weather.weather_state;
                    const time = app.todays_weather.dateTime;
            
                    if(time == null || weather_state == null){
                        return '';
                    }
                    let url = "Gradient.png";
                    //convert to 24 hour time
                    let twentyFour_hour = parseInt(time.hour);
                    if(time.dayPeriod === "PM")
                        twentyFour_hour = twentyFour_hour + 12;
                    //set arbitrary boundaries on when day/sunset/night are and if the time falls within it
                    //appends the corresponding 'time period' to the url string
                    if(twentyFour_hour >= 6 && twentyFour_hour <= 17){
                         url = "Day " + url;
                    }
                    else if(twentyFour_hour >= 19 || twentyFour_hour < 6){
                         url = "Night " + url;
                    }
                    else{
                         url = "Sunset " + url;
                    }
                    //check for cloudy variant
                    if(weather_state.includes('Cloud')){
                        url = "Cloudy " + url;
                    }
                    
                    return "media/gradients/" + url;
                }
		} // end methods
});