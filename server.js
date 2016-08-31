const http = require('http');
const request = require("request");
const _ = require("lodash");
const csv = require('csv');
const hostname = '127.0.0.1';
const port = 3000;
const fs = require('fs');
const parser = csv.parse();

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Import Server\n');
});

const locationNumber = 267; //(This number and onwards will get processed)
const maxLocationsToProcess = 1;
const authToken = "PRyL3PKHg7JAupnQKR_R";
const userId = "1";
const fileName= "Great-Room-Living-Area-Table-FINAL";
//const fileName="Bedrooms-Table-FINAL";
const adminId = 2086;

server.listen(port, hostname, () => {

	let locations = {}
	let tempLocations = {};
	console.log("Import BEGIN!")
	getLocations(1, function(){
		let tempLocationsLength = Object.keys(tempLocations).length;
		console.log("Retrieved " + tempLocationsLength + " locations.")
		_.forEach(tempLocations, (location, id)=>{
			location.ancestry = location.name;
			if(location.parent_id) recursiveAncestry(id + "", location.parent_id + "");
		})

		const ancestryHash = _.keyBy(tempLocations, 'ancestry');

		//Read CSV and verify the locations
		fs.readFile(fileName + '.csv', 'utf8', (err, data)=>{
			if(err) exitLog("Failed to open csv " + fileName);
			csv.parse(data, {}, function(err, output){
			  if(err) exitLog("Failed to parse")
			  var rows = _.groupBy(output, (row)=>{
			  	return row[0] + " > " + row[1] + " > " + row[2];
			  });
			  _.forEach(rows, (deficiencyList, ancestry)=>{
			  	//console.log(ancestry)
			  	var location = _.find(tempLocations, {ancestry: ancestry})
			  	if(!location || !location.id){
			  		exitLog("Error with locations in CSV (formatting issue?)")
			  	}
			  })

			  console.log("All rows verified (contains a location with a found ID)")

			  let locationIndex = 0
			  _.forEach(rows, (deficiencyList, ancestry)=>{
			  	if(locationIndex < locationNumber || locationIndex >= (locationNumber + maxLocationsToProcess)) return locationIndex++;
			  	let locationFound = ancestryHash[ancestry];
			  	_.forEach(deficiencyList, (deficiency)=>{
			  		//console.log(deficiency[3], locationFound)
			  		console.log({"work_sequence": {"title": deficiency[3], "state": 1, "location_id": locationFound.id, "work_items_attributes": [{"stage_number": 1, "assignments_attributes": [{"assignee_id": 8462}]}]}})
			  		request
			  			.post("https://closeout-api.gobridgit.com/api/v3/projects/391/work_sequences?auth_token=" + userId + "%3A" + authToken, {"work_sequence": {"title": deficiency[3], "state": 1, "location_id": locationFound.id, "work_items_attributes": [{"stage_number": 1, "assignments_attributes": [{"assignee_id": 8462}]}]}}, (err, response)=> {
			  				if(err) exitLog("Request failed at " + ancestry)
		  					console.log(response.body)
			  			})
			  	})
	  			console.log("Finished importing" + ancestry);
			  	locationIndex++;
			  });
			});
		});
	});

	function recursiveAncestry(id, parentId){
		tempLocations[id].ancestry = tempLocations[parentId].name + " > " + tempLocations[id].ancestry;
		if(tempLocations[parentId].parent_id) recursiveAncestry(id, tempLocations[parentId].parent_id + "")
	}

	function getLocations(page, cb){
		console.log("Requesting location page " + page);
		request("https://closeout-api.gobridgit.com/api/v3/projects/391/locations?auth_token=" + userId + "%3A" + authToken + "&page=" + page, function(error, response){
			if(error) return exitLog("Error retrieving locations")
			if(!response.body) return exitLog("Error retrieving locations")
			var response = JSON.parse(response.body);
			if(!response.locations || !response.current_page || !response.total_pages) return exitLog("Error retrieving locations") //never 0
			tempLocations = _.assign(_.keyBy(response.locations, 'id'), tempLocations);
			if(response.current_page < response.total_pages) return getLocations(++response.current_page, cb)
			console.log("Finished requesting locations")
			cb();
		})
	}

	function exitLog(error){
		console.log(error)
		process.exit();
	}

});