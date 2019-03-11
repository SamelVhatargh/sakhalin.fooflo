<?php
namespace TextGen\Markov;


class Chain
{

    public const PHRASE_START = '$start';

    public const PHRASE_END = '$end';

    public $startLink;

    public $endLink;

    public function __construct(string $startLink, string $endLink)
    {
        $this->startLink = $startLink;
        $this->endLink = $endLink;
    }
}
