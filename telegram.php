<?php

use TextGen\Db;
use TextGen\Generators\MarkovGenerator;
use TextGen\Generators\NeuralNetworkGenerator;
use TextGen\Generators\PatternGenerator;

require_once __DIR__ . '/common.php';

$telegram = new \TextGen\Telegram\TelegramSender();
$rand = rand(1, 100);

if ($rand <= 50) {
    $generator = new MarkovGenerator(new Db);
} elseif ($rand >= 50 && $rand <= 75) {
    $generator = new NeuralNetworkGenerator();
} elseif ($rand >= 75 && $rand <= 100) {
    $generator = new PatternGenerator();
}

$telegram->sendMessage($generator);
