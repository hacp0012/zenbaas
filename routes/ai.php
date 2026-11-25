<?php

use App\Mcp\Servers\ZenbaseAppServer;
use Laravel\Mcp\Facades\Mcp;

Mcp::web('/mcp', ZenbaseAppServer::class)
    ->middleware(['zenbase.mcp', 'throttle:zenbase-mcp'])
    ->name('mcp.app');
