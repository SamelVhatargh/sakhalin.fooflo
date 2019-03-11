<?php

namespace TextGen\Markov;

/**
 * Делит заголовки на цепи
 */
class ChainExtractor
{

    /**
     * @param string $text
     * @return Chain[]
     */
    public function getChains(string $text): array
    {
        $text = preg_replace(['/[^\w\s]/u', '/\s/u'], ['', ' '], $text);
        $text = Chain::PHRASE_START . ' ' . $text . ' ' . Chain::PHRASE_END;

        $words = explode(' ', $text);

        $chains = [];
        for ($i = 0; $i < count($words) - 1; $i++) {
            $chains[] = new Chain($words[$i], $words[$i + 1]);
        }

        return $chains;
    }
}
