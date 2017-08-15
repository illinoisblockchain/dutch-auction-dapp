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

function buildContractUI(deployedContract) {
  var address = deployedContract.address
  console.log({deployedContract, address})
}

$(function() {
  $(window).load(function() {
    var $contractFormsContainer = $('#contract-forms-container');
    var $accessContractForm = $('#access-contract-form');
    var $deployContractForm = $('#deploy-contract-form');
    var $contractUIContainer = $('#contract-ui-container');

    $accessContractForm.submit(function(e) {
      e.preventDefault();
      var abi = JSON.parse($('#access-abi-input').val().trim());
      var address = $('#access-address-input').val();
      var contract = web3.eth.contract(abi);
      var deployedContract = contract.at(address);
      buildContractUI(deployedContract);
    });

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
            console.log('txHash', deployedContract.transactionHash)
          // check address on the second call (contract deployed)
          } else {
            // the contract address
            console.log('address', deployedContract.address);
            buildContractUI(deployedContract);
          }
        }
      )
    });
  });
});
