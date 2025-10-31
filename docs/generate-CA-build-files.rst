Generate CA Build Files 
===========================

Introduction
--------------
`Circulatory Autogen <https://github.com/FinbarArgus/circulatory_autogen/tree/master>`_ is a software package for coupling CellML modules and facilitating model calibration, parameter identifiability, and sensitivty analysis. When generating coupled models using Circulatory Autogen, users need to provide two key configuration files:
* vessel_array.csv: A CSV file defining the relationships between modules with shared parameters.
* module_config.json: A JSON file defining parameters and ports with CellML modules.

Circulatory Autogen Model Builder (CAMB) has been designed to simplify the process of creating these configuration files by providing a visual interface. 

The purpose of this tutorial is to familiarise users with the :ref:`user interface <_user-interface>` and provide :ref:`step-by-step instructions <_instructions>` for how to use the tool to generate Circulatory Autogen configuration files for a simple example. 

.. admonition:: \ \ 
    
    As things stand, CAMB uses general ports only. Support for more complex port types will be added in the future. 

.. _user-interface:

User Interface
----------------

Overview
~~~~~~~~~~
A brief, simple introduction that defines the UI's primary purpose and layout in plain language.

Key Panels
^^^^^^^^^^^^
Describe the major sections or panels of the interface. Use clear headings and short, scannable paragraphs or bullet points.

* Activity Bar: (Left-hand side) Allows you to switch between different views (e.g., Explorer, Search, Debug).
* Editor Area: The central space where you view and edit content. You can open multiple files here.
* Status Bar: (Bottom edge) Displays important information about the current project, such as file status and errors.

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
