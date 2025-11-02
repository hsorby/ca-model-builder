Generate CA Build Files 
===========================

Introduction
--------------

`Circulatory Autogen <https://github.com/FinbarArgus/circulatory_autogen/tree/master>`_ is a software package for coupling CellML modules and facilitating model calibration, parameter identifiability, and sensitivity analysis. When generating coupled models using Circulatory Autogen, users need to provide two key configuration files:

* vessel_array.csv: A CSV file defining the relationships between modules with shared parameters.
* module_config.json: A JSON file defining parameters and ports with CellML modules.

Circulatory Autogen Model Builder (CAMB) has been designed to simplify the process of creating these configuration files by providing a visual interface. 

The purpose of this tutorial is to familiarise users with the `user interface`_ and provide step-by-step `instructions`_ for how to use the tool to generate Circulatory Autogen configuration files for a simple example. 

.. note:: 

    As things stand, CAMB uses general ports only. Support for more complex port types will be added in the future. 

.. _user interface:

User Interface
----------------

The CAMB user interface is designed to be intuitive and user-friendly. The main components of the interface are highlighted in the image below:

.. image::  /assets/images/CA-model-builder_UI.png
   :alt: CA Model Builder User Interface with workspace and module list highlighted
   :width: 200px
   :align: center

* Module List: (Left-hand side) Allows you to switch between different views (e.g., Explorer, Search, Debug).
* Workspace Area: The main area for users to place modules, draw connections, and edit ports (shared variables)
* File Management Buttons: (Upper-right-hand side) Buttons for importing CellML files, loading parameters, saving/loading workspaces, and exporting CA configuration files.

Core Elements & Interactions
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Detail the main interactive components, their appearance, and how users interact with them. Use consistent terminology.

* Buttons: Describe the visual cues (e.g., color, shape) and the action they perform (e.g., "Select the Save button to apply your changes").
* Navigation Menus: Explain where menus are located and what they contain (e.g., "Use the navigation menu at the top of the page to access Settings, Help, and your Profile").
* Input Fields: Clarify how users enter information (e.g., "Enter your email address in the Email text field").
* Icons: If icons are used without labels, provide a clear explanation of their function (e.g., "Click the magnifying glass icon to search").

.. _instructions:

Tutorial
-----------------

This section provides step-by-step instructions for using the CAMB to create Circulatory Autogen configuration files for the following simple model:
