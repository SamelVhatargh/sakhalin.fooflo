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
        $tries = 1;
        $title = $this->generateTitle();

        $wordCount = $this->countWords($title);
        while (($wordCount < 5) && $tries <= 5) {
            $title = $this->generateTitle();
            $wordCount = $this->countWords($title);
            $tries++;
        }

        return $title;
    }

    public function generateTitle(): string
    {
        return trim(shell_exec('node lib/NeuralNetwork/generate.js'));
    }

    /**
     * @param $title
     * @return int
     */
    public function countWords($title): int
    {
        return count(preg_split('~[^\p{L}\p{N}\']+~u', $title));
    }
}
