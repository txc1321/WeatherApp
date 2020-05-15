let forecasts = [];
let locations = [];

let app = new Vue({
    el: '#app',
    data:{
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
            handleInput(){
                if(!app.showList){
                    app.showList = true;
                }
                app.search();
            },
            search(){
                locations.splice(0, locations.length);
                const input = document.querySelector('#location_search');
                //due to the api not implementing CORS functionality, I am using an existing proxy server to send the appropriate headers. This is not a production solution. In that case a custom proxy server would be needed to route requests appropriately. I feel that creating my own proxy server is beyond the scope of this assignment as to why I opted to use a pre-existing one. I would also argue that if you need to use a proxy server in production the API used might not be the best choice.
                let url = "https://pure-plains-13901.herokuapp.com/metaweather.com/api/location/search/?";
                if(Number.isInteger(parseInt(input.value[0]))){
                    //todo, latlng error checking
                    url += "lattlong=";
                }
                else{
                    url += "query=";
                }
                
                if(input.value !== ""){
                    const response = fetch(url + input.value)
                    .then(response => {
                        if(!response.ok){
                            throw Error(`ERROR: ${response.statusText}`);
                        }
                        return response.json();
                    })
                    .then(json => {	
                        for(let i = 0; i < json.length; i++){
                            locations.push(json[i]);
                        }
                    });
                }
               },// end search
                handleLocation(loc){
                    app.showMenu = false;
                    if(!app.stored_locations.some((e) => e.woeid === loc.woeid)){
                        app.stored_locations.push({'title': loc.title, 'woeid': loc.woeid});
                    }
                    app.location = loc;
                    app.getForecast(loc.woeid);
                },
                getForecast(id){
                    forecasts.splice(0, forecasts.length);
                    const local_date = new Date();
                    const date_options = {
                        weekday: 'long',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                    };
                    const dTKeys = ['weekday', 'hr', 'min', 'dayNight'];
                    
                    if(app.showList){
                        app.showList = false;
                    }
                    app.showForm = false;
                    
                    fetch(`https://pure-plains-13901.herokuapp.com/metaweather.com/api/location/${id}`)
                    .then(response => {
                        if(!response.ok){
                            throw Error(`ERROR: ${response.statusText}`);
                        }
                        return response.json();
                    })
                    .then(json => {
                        for(let i = 0; i < json.consolidated_weather.length; i++){
                            let weather = {
                                weather_state: json.consolidated_weather[i].weather_state_name,
                                dateTime: Object.fromEntries(Object.entries({ ...new Intl.DateTimeFormat('en-US', date_options)
                                            .formatToParts(new Date(json.consolidated_weather[i].applicable_date + " " + local_date.getHours() + ":" + local_date.getMinutes()))
                                            .filter((d, i) => { return (i+1)%2 !== 0; })})
                                            .map(([k, v]) => [v.type, v.value])),
                                temp: Math.round(json.consolidated_weather[i].the_temp),
                                min_temp: Math.round(json.consolidated_weather[i].min_temp),
                                max_temp: Math.round(json.consolidated_weather[i].max_temp),
                                air_pressure: Math.round((json.consolidated_weather[i].air_pressure*100)/100),
                                humidity: Math.round(json.consolidated_weather[i].humidity),
                                visibility: Math.round(json.consolidated_weather[i].visibility),
                                wind: {
                                    direction: json.consolidated_weather[i].wind_direction_compass,
                                    speed: Math.round(json.consolidated_weather[i].wind_speed),
                                },
                            };
                            forecasts.push(weather);
                        }

                        app.todays_weather = forecasts[0];
                        forecasts.shift();
                        app.five_day = [...forecasts];
                        
                        const appDOM = document.querySelector("#app");
                        appDOM.style.backgroundImage = "url('" + app.gradientUrl() + "')";
                        app.gradient = app.gradientUrl();
                        app.contentReady=true;
                    });
                },
                imageUrl: (weather_state, time, main) => {
                    let twentyFour_hour = parseInt(time.hour);
                    if(time.dayPeriod === "PM")
                        twentyFour_hour = twentyFour_hour + 12;
                    
                    let url = "media/icons/";
                    if(main){
                        if(weather_state === "Clear" || weather_state === "Heavy Cloud" || weather_state === "Rain"){
                            if(twentyFour_hour >= 19 || twentyFour_hour <= 6){
                                url = url + "Night ";
                            }
                        }
                    }
                    console.log(url + `${weather_state}.png`);
                    
                    return url + `${weather_state}.png`;
                },
                gradientUrl: () => {
                    const weather_state = app.todays_weather.weather_state;
                    const time = app.todays_weather.dateTime;
            
                    if(time == null || weather_state == null){
                        return '';
                    }
                    let url = "Gradient.png";
                    let twentyFour_hour = parseInt(time.hour);
                    if(time.dayPeriod === "PM")
                        twentyFour_hour = twentyFour_hour + 12;
                    if(twentyFour_hour >= 6 && twentyFour_hour <= 17){
                         url = "Day " + url;
                    }
                    else if(twentyFour_hour >= 19 || twentyFour_hour < 6){
                         url = "Night " + url;
                    }
                    else{
                         url = "Sunset " + url;
                    }
                    
                    if(weather_state.includes('Cloud')){
                        url = "Cloudy " + url;
                    }
                    
                    return "/media/gradients/" + url;
                }
		} // end methods
});