<?php
namespace TextGen\Generators;

class LoremIpsumGenerator implements GeneratorInterface
{

    public function getName(): string
    {
        return 'Ричард МакКлинток';
    }

    public function writeArticle(): string
    {
        return 'Lorem ipsum dolor sit amet';
    }
}
