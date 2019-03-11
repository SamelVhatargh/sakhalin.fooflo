<?php
require_once __DIR__ . '/../common.php';

$texts = [
    'Сахалинец за вылов тайменей заплатит 25 тысяч рублей штрафа',
    'В Поронайске наградили "Женщин года"',
    'Южносахалинцам напоминают о штрафах за вылов водно-биологических ресурсов в запрещенный период',
];

$log = new \Monolog\Logger('chain_generator');
$log->pushHandler(new \Monolog\Handler\StreamHandler('php://stdout', \Monolog\Logger::INFO));

$log->info('test');


try {
    $chainExtractor = new \TextGen\Markov\ChainExtractor();
    $db = new \TextGen\Db();
    $db->exec('TRUNCATE TABLE markov_chains');
    $insertChainsStatement = $db->prepare(
        'INSERT INTO markov_chains(start_link, end_link) VALUES (?, ?) ON DUPLICATE KEY UPDATE weight = weight + 1'
    );

    $totalCount = 0;
    $handle = fopen(__DIR__ . '/../data/articles', "r");
    if ($handle) {
        while(!feof($handle)){
            fgets($handle);
            $totalCount++;
        }
        rewind($handle);

        $i = 1;
        while (!feof($handle)) {
            $text = fgets($handle);
            $log->debug($text);
            $chains = $chainExtractor->getChains($text);
            foreach ($chains as $chain) {
                $log->debug("{$chain->startLink} => {$chain->endLink}");
                $insertChainsStatement->execute([$chain->startLink, $chain->endLink]);
            }
            $log->info(sprintf('Обработано %s из %s', $i, $totalCount));

            $i++;
        }
    } else {
        throw new Exception('error opening file');
    }
} catch (Exception $e) {
    $log->critical($e->getMessage(), [$e]);
} finally {
    fclose($handle);
}
