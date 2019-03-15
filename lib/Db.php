<?php
namespace TextGen;

use PDO;

class Db extends PDO
{

    private $values = [];

    public function __construct()
    {
        $host = CONFIG['db']['host'];
        $port = CONFIG['db']['port'];
        $user = CONFIG['db']['user'];
        $password = CONFIG['db']['password'];
        $db = CONFIG['db']['dbname'];
        parent::__construct("mysql:host=$host;dbname=$db;port=$port", $user, $password);
        $this->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $this->exec('SET NAMES utf8');
    }

    public function batchInsert($params)
    {
        $this->values[] = $params;
        if (count($this->values) === 1000) {
            $this->finishBatch();
        }
    }

    public function finishBatch()
    {
        $values = '';
        $separator = '';
        foreach ($this->values as $value) {
            $values .= $separator . "('{$value[0]}', '{$value[1]}')";
            $separator = ',';
        }

        $query = "INSERT INTO markov_chains(start_link, end_link) VALUES $values ON DUPLICATE KEY UPDATE weight = weight + 1";

        $this->exec($query);

        $this->values = [];
    }
}
