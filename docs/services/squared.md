# Square Service

The Square Service is a Node.js interface to [Square Core](https://github.com/square/square) for querying information about the square block chain. It will manage starting and stopping `squared` or connect to several running `squared` processes. It uses a branch of a [branch of Square Core](https://github.com/bitpay/square/tree/0.12-bitcore) with additional indexes for querying information about addresses and blocks. Results are cached for performance and there are several additional API methods added for common queries.

## Configuration

The default configuration will include a "spawn" configuration in "squared". This defines the location of the block chain database and the location of the `squared` daemon executable. The below configuration points to a local clone of `square`, and will start `squared` automatically with your Node.js application.

```json
  "servicesConfig": {
    "squared": {
      "spawn": {
        "datadir": "/home/bitcore/.square",
        "exec": "/home/bitcore/square/src/squared"
      }
    }
  }
```

It's also possible to connect to separately managed `squared` processes with round-robin quering, for example:

```json
  "servicesConfig": {
    "squared": {
      "connect": [
        {
          "rpchost": "127.0.0.1",
          "rpcport": 30521,
          "rpcuser": "square",
          "rpcpassword": "local321",
          "zmqpubrawtx": "tcp://127.0.0.1:30611"
        },
        {
          "rpchost": "127.0.0.1",
          "rpcport": 30522,
          "rpcuser": "square",
          "rpcpassword": "local321",
          "zmqpubrawtx": "tcp://127.0.0.1:30622"
        },
        {
          "rpchost": "127.0.0.1",
          "rpcport": 30523,
          "rpcuser": "square",
          "rpcpassword": "local321",
          "zmqpubrawtx": "tcp://127.0.0.1:30633"
        }
      ]
    }
  }
```

**Note**: For detailed example configuration see [`regtest/cluster.js`](regtest/cluster.js)


## API Documentation
Methods are available by directly interfacing with the service:

```js
node.services.squared.<methodName>
```

### Chain

**Getting Latest Blocks**

```js
// gives the block hashes sorted from low to high within a range of timestamps
var high = 1460393372; // Mon Apr 11 2016 12:49:25 GMT-0400 (EDT)
var low = 1460306965; // Mon Apr 10 2016 12:49:25 GMT-0400 (EDT)
node.services.squared.getBlockHashesByTimestamp(high, low, function(err, blockHashes) {
  //...
});

// get the current tip of the chain
node.services.squared.getBestBlockHash(function(err, blockHash) {
  //...
})
```

**Getting Synchronization and Node Status**

```js
// gives a boolean if the daemon is fully synced (not the initial block download)
node.services.squared.isSynced(function(err, synced) {
  //...
})

// gives the current estimate of blockchain download as a percentage
node.services.squared.syncPercentage(function(err, percent) {
  //...
});

// gives information about the chain including total number of blocks
node.services.squared.getInfo(function(err, info) {
  //...
});
```

**Generate Blocks**

```js
// will generate a block for the "regtest" network (development purposes)
var numberOfBlocks = 10;
node.services.squared.generateBlock(numberOfBlocks, function(err, blockHashes) {
  //...
});
```

### Blocks and Transactions

**Getting Block Information**

It's possible to query blocks by both block hash and by height. Blocks are given as Node.js Buffers and can be parsed via Bitcore:

```js
var blockHeight = 0;
node.services.squared.getRawBlock(blockHeight, function(err, blockBuffer) {
  if (err) {
    throw err;
  }
  var block = bitcore.Block.fromBuffer(blockBuffer);
  console.log(block);
};

// get a bitcore object of the block (as above)
node.services.squared.getBlock(blockHash, function(err, block) {
  //...
};

// get only the block header and index (including chain work, height, and previous hash)
node.services.squared.getBlockHeader(blockHeight, function(err, blockHeader) {
  //...
});

// get the block with a list of txids
node.services.squared.getBlockOverview(blockHash, function(err, blockOverview) {
  //...
};
```

**Retrieving and Sending Transactions**

Get a transaction asynchronously by reading it from disk:

```js
var txid = '7426c707d0e9705bdd8158e60983e37d0f5d63529086d6672b07d9238d5aa623';
node.services.squared.getRawTransaction(txid, function(err, transactionBuffer) {
  if (err) {
    throw err;
  }
  var transaction = bitcore.Transaction().fromBuffer(transactionBuffer);
});

// get a bitcore object of the transaction (as above)
node.services.squared.getTransaction(txid, function(err, transaction) {
  //...
});

// retrieve the transaction with input values, fees, spent and block info
node.services.squared.getDetailedTransaction(txid, function(err, transaction) {
  //...
});
```

Send a transaction to the network:

```js
var numberOfBlocks = 3;
node.services.squared.estimateFee(numberOfBlocks, function(err, feesPerKilobyte) {
  //...
});

node.services.squared.sendTransaction(transaction.serialize(), function(err, hash) {
  //...
});
```

### Addresses

**Get Unspent Outputs**

One of the most common uses will be to retrieve unspent outputs necessary to create a transaction, here is how to get the unspent outputs for an address:

```js
var address = 'mgY65WSfEmsyYaYPQaXhmXMeBhwp4EcsQW';
node.services.squared.getAddressUnspentOutputs(address, options, function(err, unspentOutputs) {
  // see below
});
```

The `unspentOutputs` will have the format:

```js
[
  {
    address: 'mgY65WSfEmsyYaYPQaXhmXMeBhwp4EcsQW',
    txid: '9d956c5d324a1c2b12133f3242deff264a9b9f61be701311373998681b8c1769',
    outputIndex: 1,
    height: 150,
    satoshis: 1000000000,
    script: '76a9140b2f0a0c31bfe0406b0ccc1381fdbe311946dadc88ac',
    confirmations: 3
  }
]
```

**View Balances**

```js
var address = 'mgY65WSfEmsyYaYPQaXhmXMeBhwp4EcsQW';
node.services.squared.getAddressBalance(address, options, function(err, balance) {
  // balance will be in satoshis with "received" and "balance"
});
```

**View Address History**

This method will give history of an address limited by a range of block heights by using the "start" and "end" arguments. The "start" value is the more recent, and greater, block height. The "end" value is the older, and lesser, block height. This feature is most useful for synchronization as previous history can be omitted. Furthermore for large ranges of block heights, results can be paginated by using the "from" and "to" arguments.

```js
var addresses = ['mgY65WSfEmsyYaYPQaXhmXMeBhwp4EcsQW'];
var options = {
  start: 345000,
  end: 344000,
  queryMempool: true
};
node.services.squared.getAddressHistory(addresses, options, function(err, history) {
  // see below
});
```

The history format will be:

```js
{
  totalCount: 1, // The total number of items within "start" and "end"
  items: [
    {
      addresses: {
        'mgY65WSfEmsyYaYPQaXhmXMeBhwp4EcsQW': {
          inputIndexes: [],
          outputIndexes: [0]
        }
      },
      satoshis: 1000000000,
      tx: <detailed_transaction> // the same format as getDetailedTransaction
    }
  ]
}
```

**View Address Summary**

```js
var address = 'mgY65WSfEmsyYaYPQaXhmXMeBhwp4EcsQW';
var options = {
  noTxList: false
};

node.services.squared.getAddressSummary(address, options, function(err, summary) {
  // see below
});
```

The `summary` will have the format (values are in satoshis):

```js
{
  totalReceived: 1000000000,
  totalSpent: 0,
  balance: 1000000000,
  unconfirmedBalance: 1000000000,
  appearances: 1,
  unconfirmedAppearances: 0,
  txids: [
    '3f7d13efe12e82f873f4d41f7e63bb64708fc4c942eb8c6822fa5bd7606adb00'
  ]
}
```
**Notes**:
- `totalReceived` does not exclude change *(the amount of satoshis originating from the same address)*
- `unconfirmedBalance` is the delta that the unconfirmed transactions have on the total balance *(can be both positive and negative)*
- `unconfirmedAppearances` is the total number of unconfirmed transactions
- `appearances` is the total confirmed transactions
- `txids` Are sorted in block order with the most recent at the beginning. A maximum of 1000 *(default)* will be returned, the `from` and `to` options can be used to get further values.


## Events
The Square Service exposes two events via the Bus, and there are a few events that can be directly registered:

```js
node.services.squared.on('tip', function(blockHash) {
  // a new block tip has been added, if there is a rapid update (with a second) this will not emit every tip update
});

node.services.squared.on('tx', function(transactionBuffer) {
  // a new transaction has entered the mempool
});

node.services.squared.on('block', function(blockHash) {
  // a new block has been added
});
```

For details on instantiating a bus for a node, see the [Bus Documentation](../bus.md).
- Name: `squared/rawtransaction`
- Name: `squared/hashblock`
- Name: `squared/addresstxid`, Arguments: [address, address...]

**Examples:**

```js
bus.subscribe('squared/rawtransaction');
bus.subscribe('squared/hashblock');
bus.subscribe('squared/addresstxid', ['13FMwCYz3hUhwPcaWuD2M1U2KzfTtvLM89']);

bus.on('squared/rawtransaction', function(transactionHex) {
  //...
});

bus.on('squared/hashblock', function(blockhashHex) {
  //...
});

bus.on('squared/addresstxid', function(data) {
  // data.address;
  // data.txid;
});
```
