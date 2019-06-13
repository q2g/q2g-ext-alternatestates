# Alternate States Extension
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/4580d4d108514111bd66e6e1d1e1f151)](https://www.codacy.com/app/thomashaenig/q2g-ext-alternatestates?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=q2g/q2g-ext-alternatestates&amp;utm_campaign=Badge_Grade)
[![TravisCI](https://travis-ci.com/q2g/q2g-ext-alternatestates.svg?branch=master)](https://travis-ci.org/q2g/q2g-ext-alternatestates)
<a href="https://m.sense2go.net/extension-package"><img src="https://m.sense2go.net/downloads.svg" alt="drawing" width="130"/></a>

This extension enables the user to take advantage of alternate states in qlik sense. With alternate states you can compare several states in one application.
With these extension you can create and delete alternate states in the application. After you have a alternate state to use, you can apply this to the objects used in the application. After applying a state to an object, this will not react on selections made in objects without state, or applayed to a other state.


## Intro

![teaser](./docs/teaser.gif "Short teaser")


## Settings

### Options

In the accessibillity options you can switch the use of shortcuts from the default values to customise shortcuts. The recommendation ist to use the combination of "strg + alt + {any keycode}", so that you do not get in truble with screenreaders shortcuts.

![settings](./docs/screenshot_4.PNG?raw=true "Title")


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
