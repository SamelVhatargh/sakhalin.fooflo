<?php
require_once __DIR__ . '/common.php';

//$generator = new \TextGen\Generators\LoremIpsumGenerator();
//$generator = new \TextGen\Generators\MarkovGenerator(new \TextGen\Db());
//$generator = new \TextGen\Generators\PatternGenerator();
$generator = new \TextGen\Generators\NeuralNetworkGenerator();

echo sprintf('%s написал "%s"', $generator->getName(), $generator->writeArticle()) . PHP_EOL;
