const http = require('http');
const request = require("request");
const _ = require("lodash");

const hostname = '127.0.0.1';
const port = 3000;
const accountSid = '<TWILIO_SID>'; 
const authToken = '<TWILIO_AUTH_TOKEN>'; 
 
//require the Twilio module and create a REST client 
const client = require('twilio')(accountSid, authToken); 
	

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Pokemon Text Server\n');
});

server.listen(port, hostname, () => {
	const pokemonToNotify = ["Victreebel", "Venusaur", "Blastoise", "Charizard", "Jolteon", "Vaporeon", "Gyrados", "Porygon", "Lapras", "Flareon", "Omastar", "Arcanine", "Kabutops", "Ditto", "Snorlax", "Articuno", "Moltres", "Zapdos", "Dragonite", "Mewtwo", "Mew", "Chansey", "Gengar", "Rapidash", "Golem"]
	const numbersToContact = ["1231231234"]

	var modifiedPokemon = {};

	_.map(pokemonToNotify, (pokemon)=>{
		modifiedPokemon[pokemon] = null;
	})

	setInterval(()=>{

		for(var key in modifiedPokemon){
			if(!modifiedPokemon[key]) continue;

			if(modifiedPokemon[key].getTime() < new Date().getTime()){
				modifiedPokemon[key] = null;
			}
		}

		request("http://www.<POKEGO_URL>.com/raw_data", function(error, response, body) {
			var pokemons = JSON.parse(body).pokemons;

			_.map(pokemonToNotify, (pokemon_name)=>{
				if(_.find(pokemons, {pokemon_name: pokemon_name})){

					var pokemon = _.find(pokemons, {pokemon_name: pokemon_name});

					if(modifiedPokemon[pokemon_name] != null) return;

					var pokemon_expiration_time = new Date(pokemon.disappear_time);
					var today = new Date();
					var diffMs = (pokemon_expiration_time - today);
					if(diffMs < 0) return;
					var diffMins = Math.round(((diffMs % 86400000) % 3600000) / 60000);

					var message = "There's a " + pokemon_name + " in Kitchener, expires in " + diffMins + " minutes!" + " http://maps.google.com/?q="  + pokemon.latitude + "%2C" + pokemon.longitude;
					console.log(message)
					_.map(numbersToContact, (number)=>{
						client.messages.create({
							to: number,  
							from: "+<TWILIO_NUMBER>",
							body: message
						}, function(err, message) { 
							console.log(message.sid); 
						});
					})
					modifiedPokemon[pokemon_name] = pokemon_expiration_time;
				}
			})
		});
	}, 10000)

});