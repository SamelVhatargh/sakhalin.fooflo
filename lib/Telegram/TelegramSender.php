<?php

namespace TextGen\Telegram;

class TelegramSender
{
    public function sendMessage($message)
    {
        $ch = curl_init();
        curl_setopt_array(
            $ch,
            array(
                CURLOPT_URL => 'https://api.telegram.org/bot' . CONFIG['tg']['token'] . '/sendMessage',
                CURLOPT_POST => TRUE,
                CURLOPT_RETURNTRANSFER => TRUE,
                CURLOPT_TIMEOUT => 10,
                CURLOPT_POSTFIELDS => array(
                    'chat_id' => CONFIG['tg']['chatId'],
                    'text' => $message,
                ),
                CURLOPT_PROXY => CONFIG['tg']['proxy'],
                CURLOPT_PROXYUSERPWD => CONFIG['tg']['proxyuserpwd'],
                CURLOPT_PROXYTYPE => CURLPROXY_SOCKS5,
                CURLOPT_PROXYAUTH => CURLAUTH_BASIC,
            )
        );

        curl_exec($ch);
    }
}
