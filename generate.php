<?php

/* @var \Composer\Autoload\ClassLoader $loader */
$loader = require_once __DIR__ . '/vendor/autoload.php';

$loader->addPsr4('TextGen\\', __DIR__  . '/lib');

$generator = new \TextGen\Generators\LoremIpsumGenerator();

echo sprintf('%s написал "%s"', $generator->getName(), $generator->writeArticle()) . PHP_EOL;
