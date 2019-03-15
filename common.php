<?php
/* @var \Composer\Autoload\ClassLoader $loader */
$loader = require_once __DIR__ . '/vendor/autoload.php';

$loader->addPsr4('TextGen\\', __DIR__  . '/lib');

define('CONFIG', require_once __DIR__ . '/config.php');