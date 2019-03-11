<?php
namespace TextGen;

use PDO;

class Db extends PDO
{
    public function __construct()
    {
        parent::__construct('mysql:host=localhost;dbname=generator;port=5115', 'root', 'root');
        $this->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $this->exec('SET NAMES utf8');
    }
}
