# Alternate States Extension
[![Greenkeeper badge](https://badges.greenkeeper.io/q2g/q2g-ext-alternatestates.svg)](https://greenkeeper.io/)
[![TravisCI](https://travis-ci.org/q2g/q2g-ext-alternatestates.svg?branch=master)](https://travis-ci.org/q2g/q2g-ext-alternatestates)
[![Downloads](https://m.sense2go.net/downloads.svg?q2g-ext-alternatestates)](https://m.sense2go.net/extension-package)

This extension was developed, to get alternate states into Qlik Sense. It is possible to create as well as deleate alternate States, and apply the states to specific objects.

## Intro

![teaser](./docs/teaser.gif "Short teaser")

## Settings

### Options

In the accessibillity options you can switch the use of shortcuts from the default values to customise shortcuts. The recommendation ist to use the combination of "strg + alt + {any keycode}", so that you do not get in truble with screenreaders shortcuts.

![](./docs/screenshot_4.png?raw=true)

## Install

### binary

1. [Download the ZIP](https://m.sense2go.net/extension-package) and unzip
2. Qlik Sense Desktop
   Copy it to: %homeptah%\Documents\Qlik\Sense\Extensions and unzip
3. Qlik Sense Entripse
   Import in the QMC

### source

1. Clone the Github Repo into extension directory
2. Install [nodejs](https://nodejs.org/)
3. Open Node.js command prompt
4. npm install
5. npm run build
