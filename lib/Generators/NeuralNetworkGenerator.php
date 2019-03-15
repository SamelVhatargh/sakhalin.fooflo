<?php
namespace TextGen\Generators;

class NeuralNetworkGenerator implements GeneratorInterface
{

    public function getName(): string
    {
        return 'Сеня Нейронов';
    }

    public function writeArticle(): string
    {
        return trim(shell_exec('node lib/NeuralNetwork/generate.js'));
    }
}
