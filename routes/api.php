<?php

use App\Modules\Auth\Http\Controllers\AuthApiController;
use App\Modules\Database\Http\Controllers\DatabaseApiController;
use App\Modules\Functions\Http\Controllers\FunctionApiController;
use App\Modules\Storage\Http\Controllers\StorageApiController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->middleware(['zenbase.cors'])->group(function (): void {
    Route::options('{any}', fn () => response('', 204))->where('any', '.*');

    Route::middleware(['zenbase.apikey', 'throttle:zenbase-api'])->group(function (): void {
        // Module Database (NoSQL Collections, Schemas & JSON/BLOB Documents)
        Route::get('collections', [DatabaseApiController::class, 'indexCollections'])->name('api.v1.collections.index');
        Route::post('collections', [DatabaseApiController::class, 'storeCollection'])->name('api.v1.collections.store');
        Route::get('collections/{collection}/schema', [DatabaseApiController::class, 'showCollectionSchema'])->name('api.v1.collections.schema.show');
        Route::put('collections/{collection}/schema', [DatabaseApiController::class, 'updateCollectionSchema'])->name('api.v1.collections.schema.update');
        Route::delete('collections/{collection}', [DatabaseApiController::class, 'destroyCollection'])->name('api.v1.collections.destroy');

        Route::get('collections/{collection}', [DatabaseApiController::class, 'indexRecords'])->name('api.v1.collections.records.list');
        Route::post('collections/{collection}', [DatabaseApiController::class, 'storeRecord'])->name('api.v1.collections.records.create');
        Route::get('collections/{collection}/records', [DatabaseApiController::class, 'indexRecords'])->name('api.v1.records.index');
        Route::post('collections/{collection}/records', [DatabaseApiController::class, 'storeRecord'])->name('api.v1.records.store');
        Route::get('collections/{collection}/records/{recordId}', [DatabaseApiController::class, 'showRecord'])->name('api.v1.records.show');
        Route::match(['put', 'patch'], 'collections/{collection}/records/{recordId}', [DatabaseApiController::class, 'updateRecord'])->name('api.v1.records.update');
        Route::delete('collections/{collection}/records/{recordId}', [DatabaseApiController::class, 'destroyRecord'])->name('api.v1.records.destroy');

        // Module Auth (Email/Password & OTP)
        Route::post('auth/signup', [AuthApiController::class, 'signUp'])->name('api.v1.auth.signup');
        Route::post('auth/signin', [AuthApiController::class, 'signIn'])->name('api.v1.auth.signin');
        Route::post('auth/otp/send', [AuthApiController::class, 'sendOtp'])->name('api.v1.auth.otp.send');
        Route::post('auth/otp/verify', [AuthApiController::class, 'verifyOtp'])->name('api.v1.auth.otp.verify');
        Route::get('auth/user', [AuthApiController::class, 'me'])->name('api.v1.auth.me');
        Route::post('auth/signout', [AuthApiController::class, 'signOut'])->name('api.v1.auth.signout');

        // Module Storage (Isolated File Storage)
        Route::get('storage/files', [StorageApiController::class, 'index'])->name('api.v1.storage.index');
        Route::post('storage/upload', [StorageApiController::class, 'upload'])->name('api.v1.storage.upload');
        Route::delete('storage/files/{file}', [StorageApiController::class, 'destroy'])->name('api.v1.storage.destroy');

        // Module Functions (Serverless PHP Web Functions)
        Route::post('functions/{functionName}/invoke', [FunctionApiController::class, 'invoke'])->name('api.v1.functions.invoke');
        Route::post('functions/{functionName}', [FunctionApiController::class, 'invoke'])->name('api.v1.functions.call');
    });
});
