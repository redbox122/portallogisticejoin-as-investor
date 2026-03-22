<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Contract extends Model
{
    protected $fillable = [
        'national_id',
        'contract_text',
        'request_id',
        'status',
    ];
}
