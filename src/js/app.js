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
    callback: function(err, currentPrice) {
      var result = web3.fromWei(currentPrice, 'ether').toString(10);
      $('#currentPrice-value').text(result)
    }
  },
  {
    name: 'biddingOpen',
    callback: function(err, isOpen) {
      $('#biddingOpen-value').text(isOpen);
    }
  },
  {
    name: 'getWinningBidder',
    callback: function(err, winningBidder) {
      $('#getWinningBidder-value').text(winningBidder);
    }
  }
];

/* Names and desired callbacks of contract methods that mutate state
** https://github.com/ethereum/wiki/wiki/JavaScript-API#contract-methods
** ********************************** */
var mutatingContractOpts = [
  {
    name: 'bid',
    callback: function(err, result) { }
  },
  { // creator only
    name: 'finalize',
    callback: function(err, result) { }
  },
  { // test only
    name: 'overrideTime',
    callback: function(err, result) { }
  },
  { // test only
    name: 'clearTime',
    callback: function(err, result) { }
  }
];

$(function() {
  $(window).load(function() {
    var $contractFormsContainer = $('#contract-forms-container');
    var $accessContractForm = $('#access-contract-form');
    var $deployContractForm = $('#deploy-contract-form');
    var $contractUIContainer = $('#contract-ui-container');
    $contractUIContainer.hide()

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
      buildContractUI(deployedContract);
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

      // deploy the contract
      web3.eth.contract(abi).new(
        initialPrice,
        biddingPeriod,
        offerPriceDecrement,
        testMode,
        { data: '0x' + bytecode, from: web3.eth.coinbase, gas: gas },
        function(err, deployedContract) {
          console.log({err, deployedContract})
          // check tx hash on the first call (transaction send)
          if (!deployedContract.address) {
            // The hash of the transaction, which deploys the contract
            console.log('txHash:', deployedContract.transactionHash)
          // check address on the second call (contract deployed)
          } else {
            // the contract address
            console.log('contract address:', deployedContract.address);
            buildContractUI(deployedContract);
          }
        }
      )
    });

    /* Use jQuery to build out some interaction points with the contract
    ** ********************************** */
    function buildContractUI(deployedContract) {
      $contractUIContainer.show();
      $contractFormsContainer.hide();

      $constantFunctionsContainer = $('#constant-functions-container');
      $constantFunctions = constantContractOpts.map(function(opts, i) {
        var methodName = opts.name;
        var callback = opts.callback;
        return $('<div class="row">')
          .append($('<div class="col s6">')
            .append($('<button class="btn waves-effect waves-light no-uppercase">')
              .text(methodName + '()')
              .click(function(e) { deployedContract[methodName](callback) })))
          .append($('<div class="col s6">')
            .append($('<p id="' + methodName + '-value">')
              .text('fetch me!')))
      })
      $constantFunctionsContainer.append($constantFunctions)

      $mutatingFunctionsContainer = $('#mutating-functions-container');
      /* TODO: build out UI for mutating functions */

    }
  });
});
