/* Connect to a web3 provider
** ********************************** */
// Supports Mist, and other wallets that provide 'web3'.
if (typeof web3 !== 'undefined') {
  // Use the Mist/wallet/Metamask provider.
  console.log('Injected web3 detected.')
  window.web3 = new Web3(web3.currentProvider);
} else {
  // Your preferred fallback.
  console.log('No web3 instance injected, using Local web3.')
  window.web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));
}

/* Names and desired callbacks of contract methods that are constant
** http://solidity.readthedocs.io/en/develop/contracts.html#constant-functions
** ********************************** */
var constantContractOpts = [
  {
    name: 'currentPrice',
    callback: function(err, result) {
      var currentPrice = web3.fromWei(result, 'ether').toString(10);
      $('#currentPrice-error').text(err);
      $('#currentPrice-result').text(currentPrice);
    }
  },
  { name: 'biddingOpen' },
  { name: 'getWinningBidder' }
];

/* Names and desired callbacks of contract methods that mutate state
** https://github.com/ethereum/wiki/wiki/JavaScript-API#contract-methods
** ********************************** */
var mutatingContractOpts = [
  { name: 'bid', payable: true },
  { name: 'finalize' },
  {
    name: 'overrideTime',
    inputs: [ { name: 'time', type: 'number', label: 'time (blocks)' } ]
  },
  { name: 'clearTime' }
];

$(function() {
  $(window).load(function() {
    var $contractFormsContainer = $('#contract-forms-container');
    var $accessContractForm = $('#access-contract-form');
    var $deployContractForm = $('#deploy-contract-form');
    var $contractControlsContainer = $('#contract-controls-container');
    $contractControlsContainer.hide()

    /* Get a contract instance on form submit
    ** https://github.com/ethereum/wiki/wiki/JavaScript-API#web3ethcontract
    ** ********************************** */
    $accessContractForm.submit(function(e) {
      e.preventDefault();
      var abi = JSON.parse($('#access-abi-input').val().trim());
      var address = $('#access-address-input').val();
      var contract = web3.eth.contract(abi);
      var deployedContract = contract.at(address);
      // the contract address
      console.log('contract address:', deployedContract.address);
      console.log('deployed contract:', deployedContract);
      buildContractControls(deployedContract);
    });

    /* Deploy a contract on form submit
    ** https://github.com/ethereum/wiki/wiki/JavaScript-API#web3ethcontract
    ** ********************************** */
    $deployContractForm.submit(function(e) {
      e.preventDefault()
      var initialPrice = web3.toWei($('#deploy-initialPrice-input').val(), 'ether');
      var biddingPeriod = Number($('#deploy-biddingPeriod-input').val());
      var offerPriceDecrement = web3.toWei($('#deploy-offerPriceDecrement-input').val(), 'ether');
      var testMode = $('#deploy-testMode-input').prop('checked');

      var abi = JSON.parse($('#deploy-abi-input').val().trim());
      var bytecode = $('#deploy-bytecode-input').val().trim();
      var gas = Number($('#deploy-gas-input').val());

      var transactionObject = { data: '0x' + bytecode, from: web3.eth.coinbase, gas: gas };

      // deploy the contract
      web3.eth.contract(abi).new(
        initialPrice,
        biddingPeriod,
        offerPriceDecrement,
        testMode,
        transactionObject,
        function(err, deployedContract) {
          // check tx hash on the first call (transaction send)
          if (!deployedContract.address) {
            // The hash of the transaction, which deploys the contract
            console.log('txHash:', deployedContract.transactionHash)
          // check address on the second call (contract deployed)
          } else {
            // the contract address
            console.log('contract address:', deployedContract.address);
            console.log('deployed contract:', deployedContract);
            buildContractControls(deployedContract);
          }
        }
      )
    });

    /* Use jQuery to build out some interaction points with the contract
    ** ********************************** */
    function buildContractControls(deployedContract) {
      // show controls / hide forms
      $contractControlsContainer.show();
      $contractFormsContainer.hide();

      // controls for the constant methods
      $constantFunctionsControls = $('#constant-functions-controls');
      $constantFunctions = constantContractOpts.map(function(opts, i) {
        var methodName = opts.name;
        var callback = opts.callback || function (err, result) {
          $('#' + methodName + '-error').text(err && err && err.message);
          $('#' + methodName + '-result').text(result);
        };
        return $('<div class="row">')
          .append($('<div class="col s6">')
            // button to fire the function
            .append($('<button class="btn waves-effect waves-light no-uppercase">')
              .text(methodName + '()')
              .click(function(e) { deployedContract[methodName](callback) })))
          // result and error statuses
          .append($('<div class="col s6">')
            .append($('<p>')
              .append($('<label>')
                .text('Error:'))
              .append($('<span id="' + methodName + '-error">')))
            .append($('<p>')
              .append($('<label>')
                .text('Result:'))
              .append($('<span id="' + methodName + '-result">'))))
      })
      $constantFunctionsControls.append($constantFunctions)

      // controls for the mutating methods
      $mutatingFunctionsControls = $('#mutating-functions-controls');
      $mutatingFunctions = mutatingContractOpts.map(function(opts, i) {
        var methodName = opts.name;
        var payable = opts.payable;
        var inputs = opts.inputs || [];
        var inputNames = inputs.map(function(opts) { return opts.name });
        var callback = opts.callback || function (err, result) {
          $('#' + methodName + '-error').text(err && err.message);
          $('#' + methodName + '-result').text(result);
        };
        return $('<div class="row">')
          .append($('<div class="col s6">')
            // paramater inputs
            .append(inputs.map(function(opts) {
              var name = opts.name;
              var type = opts.type;
              var placeholder = opts.placeholder;
              var label = opts.label || name;
              var id = methodName + '-' + name + '-input';
              return $('<div class="input-field">')
                .append($('<input class="validate">')
                  .attr({id, name, type, placeholder}))
                .append($('<label for="' + id + '">')
                  .text(label)) }))
            // value input for payable functions
            .append(payable
              ? $('<div class="input-field">')
                .append($('<input class="validate">')
                  .attr({
                    id: methodName + '-value-input',
                    name: 'value',
                    type: 'number' }))
                .append($('<label for="' + methodName + '-value-input">')
                  .text('Value (ether)'))
              : [])
            // button to fire it
            .append($('<button class="btn waves-effect waves-light no-uppercase">')
              .text(methodName + '(' + inputNames.join(', ') + ')')
              .click(function(e) {
                var params = inputNames.map(function(name) {
                  return $('#' + methodName + '-' + name + '-input').val()
                })
                var transactionObject = { from: web3.eth.coinbase };
                if (payable) {
                  /* Payable function
                  ** https://github.com/ethereum/wiki/wiki/JavaScript-API#web3ethsendtransaction
                  ** ********************************** */
                  transactionObject.value = $('#' + methodName + '-value-input').val();
                  var args = params.concat([transactionObject, callback]);
                  console.log({methodName, args});
                  deployedContract[methodName].apply(deployedContract, args);
                } else {
                  /* Normal function
                  ** https://github.com/ethereum/wiki/wiki/JavaScript-API#web3ethsendtransaction
                  ** ********************************** */
                  var args = params.concat([transactionObject, callback])
                  console.log({methodName, args});
                  deployedContract[methodName].apply(deployedContract, args);
                }
              } )))
            // result and error statuses
            .append($('<div class="col s6">')
              .append($('<p>')
                .append($('<label>')
                  .text('Error:'))
                .append($('<span id="' + methodName + '-error">')))
              .append($('<p>')
                .append($('<label>')
                  .text('Result:'))
                .append($('<span id="' + methodName + '-result">'))))
      })
      $mutatingFunctionsControls.append($mutatingFunctions);
    }
  });
});
