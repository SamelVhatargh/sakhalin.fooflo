<?php
namespace TextGen\Generators;

interface GeneratorInterface
{
    public function getName(): string;

    public function writeArticle(): string;
}
