<?php
require_once __DIR__ . '/common.php';

$telegram = new \TextGen\Telegram\TelegramSender();

$telegram->sendMessage('test');
