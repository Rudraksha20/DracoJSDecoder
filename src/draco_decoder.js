var Draco = require("./draco_header.js");
var fs = require(`fs`);

// Get the input and output file locations, file names and types
var draco_decoder = new Draco(process.argv[3], process.argv[5]);

// Check if proper arguments are provided and print the usage if not.
if(process.argv.length < 6) {
    console.log("Incorrect usage! \n");
    draco_decoder.PrintUsage();
}

// Read the file and save the data in the buffer
try {  
    var data = fs.readFileSync(draco_decoder.input_file_location);
    draco_decoder.CreateDecodeBuffer(data, data.length);
} catch(e) {
    console.log(e.stack);
}

// Decode the header
if(!draco_decoder.DecodeHeader()) {
    throw("Error: Error while decoding header, please check your .drc encoded file.");
}

// Decode the buffer
if(!draco_decoder.Decode()) {
    throw("Error: Error while decoding buffer, please check your .drc encoded file.");
}

// Parse the input and output and store their values