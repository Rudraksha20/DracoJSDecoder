import { Module } from "module";

var Draco = require("./draco_header.js");
var fs = require(`fs`);


// Check if proper arguments are provided and print the usage if not.
if(process.argv.length < 3) {
    console.log("Incorrect usage! \n");
    draco_decoder.PrintUsage();
}

// Get the input and output file locations, file names and types
// var draco_decoder = new Draco(process.argv[3], process.argv[5]);
var draco_decoder = new Draco(process.argv[3]);

// Read the file and save the data in the buffer
try {  
    var data = fs.readFileSync(draco_decoder.input_file_location);
    DracoJSDecoder(data, data.length);
} catch(e) {
    console.log(e.stack);
}

function DracoJSDecoder(bufer_data, buffer_length) {
    draco_decoder.CreateDecodeBuffer(bufer_data, buffer_length);

    // Decode the header
    if(!draco_decoder.DecodeHeader()) {
        throw("Error: Error while decoding header, please check your .drc encoded file.");
    }

    // Decode the buffer
    if(!draco_decoder.Decode()) {
        throw("Error: Error while decoding buffer, please check your .drc encoded file.");
    }
}

// Store the output in an object and return the object


// Exporting the DracoJSDecoder function for anyone to use
module.exports = DracoJSDecoder;