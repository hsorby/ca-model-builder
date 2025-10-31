Generate CA Build Files 
===========================

This document describes how to generate the vessel_array.csv and module_config.json files for Circulatory Autogen using the Circulatory Autogen Model Builder (CAMB) tool. 

Background
----------
`Circulatory Autogen <https://github.com/FinbarArgus/circulatory_autogen/tree/master>`_ is a software package for coupling CellML modules and facilitating model calibration, parameter identifiability, and sensitivty analysis. When generating coupled models using Circulatory Autogen, users need to provide two key configuration files:
- vessel_array.csv: A CSV file defining the relationships between modules with shared parameters.
- module_config.json: A JSON file defining parameters and ports with CellML modules.

CAMB has been designed to simplify the process of creating these configuration files by providing a visual interface. As things stand, CAMB uses general ports only. Support for more complex port structures will be added in the future. 