<?php

use TextGen\Db;
use TextGen\Generators\MarkovGenerator;
use TextGen\Generators\NeuralNetworkGenerator;
use TextGen\Generators\PatternGenerator;

require_once __DIR__ . '/common.php';

const MARKOV_GENERATOR = 50;
const NEURAL_NETWORK_GENERATOR = 25;
const PATTERN_GENERATOR = 25;

$telegram = new \TextGen\Telegram\TelegramSender();
$rand = rand(1, 100);

if ($rand <= MARKOV_GENERATOR) {
    $generator = new MarkovGenerator(new Db);
} elseif (MARKOV_GENERATOR + NEURAL_NETWORK_GENERATOR >= $rand) {
    $generator = new NeuralNetworkGenerator();
} else {
    $generator = new PatternGenerator();
}

$telegram->sendMessage($generator);
