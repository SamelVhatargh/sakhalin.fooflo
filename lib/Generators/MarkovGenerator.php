<?php

namespace TextGen\Generators;


use PDO;
use TextGen\Markov\Chain;

class MarkovGenerator implements GeneratorInterface
{
    /**
     * @var PDO
     */
    private $db;

    private $linksStatement;

    public function __construct(PDO $db)
    {
        $this->db = $db;
        $this->linksStatement = $this->db->prepare('SELECT end_link, weight FROM markov_chains WHERE start_link = ?');
    }

    public function getName(): string
    {
        return 'Андрей Марков';
    }

    public function writeArticle(): string
    {
        $title = '';
        $word = $this->getLink(Chain::PHRASE_START);
        $separator = '';
        while ($word !== Chain::PHRASE_END) {
            $title .= $separator . $word;
            $word = $this->getLink($word);
            $separator = ' ';
        }

        return $title;
    }

    private function getLink(string $startLink): string
    {
        $this->linksStatement->execute([$startLink]);

        $links = $this->linksStatement->fetchAll(PDO::FETCH_ASSOC);

        $totalWeight = 0;
        foreach ($links as &$link) {
            $range = $link['weight'] + $totalWeight;
            $link['minRange'] = $totalWeight + 1;
            $link['maxRange'] = $range;
            $totalWeight += $link['weight'];
        }

        $rand = mt_rand(1, $totalWeight);

        foreach ($links as $link) {
            if ($link['minRange'] <= $rand && $rand <= $link['maxRange']) {
                return $link['end_link'];
            }
        }
        return Chain::PHRASE_END;
    }


}
