
<h1>
<P align = "center">
DracoJSDecoder
</P>
</h1>

<P align = "center">
<img src = "./images/DracoLogo.jpeg" />
</p>

Description
===========

Draco is a library for compressing and decompressing 3D geometric meshes and
point clouds. It is intended to improve the storage and transmission of 3D
graphics.

Draco was designed and built for compression efficiency and speed. The code
supports compressing points, connectivity information, texture coordinates,
color information, normals, and any other generic attributes associated with
geometry. With Draco, applications using 3D graphics can be significantly
smaller without compromising visual fidelity. For users, this means apps can
now be downloaded faster, 3D graphics in the browser can load quicker, and VR and AR scenes can now be transmitted with a fraction of the bandwidth and
rendered quickly.

Draco is released as C++ source code that can be used to compress 3D graphics as well as C++ and Javascript decoders for the encoded data.

_**Contents**_

    * Building
    * Run

Building
========

Clone this repository to your computer and open terminal or command prompt and `cd` into the `src` directory inside the Draco decoder. 

#### Windows

On your windows computer after the previous step you would first need to install `node` on your system.

[Here](http://blog.teamtreehouse.com/install-node-js-npm-windows) is a good tutorial by Dave McFarland on how to install node on your system.

#### MacOS

You would first need to install node on your mac computer.

[Here](http://nodesource.com/blog/installing-nodejs-tutorial-mac-os-x/) is a good tutorial by Tierney Cyren on how to install node on your mac.

Run
======

Once you have installed node and you have `cd` in the src directory you can run the following command to decode a Draco(`.drc`) encoded file.

There is a sample draco encoded file provided for you to test in the samples folder. You can use this for now to test the decoder.s

In order to run the decoder you will have to follow the following command style.

 - node draco_decoder -i absolute path to the .drc encoded file -o name of the output file followed by the .ply or .obj extension

Sample:


    `node draco_decoder -i C:\Users\xyzUser\Documents\DracoJSDecoder\DracoJSDecoder\samples\DracoEncodedSequentially.drc -o DracoDecoded.ply`


Important Note
----------

The JS decoder is currently a work in progress. It can decode the following data:

-   Header, Connectivity (Sequential).

I am currently working on decoding the attribute data.

Thank you for taking interest in my work! If you have any questions or comments please feel free to contact me via my email: rdimple@seas.upenn.edu.