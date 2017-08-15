// Supports Mist, and other wallets that provide 'web3'.
if (typeof web3 !== 'undefined') {
  // Use the Mist/wallet/Metamask provider.
  console.log('web3 found')
  window.web3 = new Web3(web3.currentProvider);
} else {
  // Your preferred fallback.
  window.web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));
}

var deployedContract;

$(function() {
  $(window).load(function() {
    var $contractForm = $('#contract-form');
    var $contractUI = $('#contract-ui');

    $contractForm.submit(function(e) {
      e.preventDefault();
      var abi = $('#abi-input').val();
      var address = $('#address-input').val();
      var contract = web3.eth.contract(JSON.parse(abi));
      deployedContract = contract.at(address);
      $contractForm.hide();
      console.log({deployedContract});
    });
  });
});
