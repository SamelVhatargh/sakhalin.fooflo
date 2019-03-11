<?php
require_once __DIR__ . '/common.php';

//$generator = new \TextGen\Generators\LoremIpsumGenerator();
$generator = new \TextGen\Generators\MarkovGenerator(new \TextGen\Db());

echo sprintf('%s написал "%s"', $generator->getName(), $generator->writeArticle()) . PHP_EOL;
