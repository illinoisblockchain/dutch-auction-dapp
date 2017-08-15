pragma solidity ^0.4.11;

contract VickreyAuction {

    // TODO: place your code here
    mapping(address => bytes32) public bids;
    uint256 _bidDepositAmount;
    uint256 _bidCommitmentDeadline;
    uint256 public _highestBidValue;
    uint256 public _secondHighestBidValue;
    uint256 _reservePrice;
    uint256 _startTime;
    uint256 _endTime;
    address public _highestBidder;

    // constructor
    function VickreyAuction(uint256 reservePrice,
                            uint256 commitTimePeriod, uint256 revealTimePeriod,
                            uint256 bidDepositAmount, bool testMode) {
        _testMode = testMode;
        _creator = msg.sender;
        _startTime = getBlockNumber();
        _bidCommitmentDeadline = _startTime + commitTimePeriod;
        _endTime = _startTime + commitTimePeriod + revealTimePeriod;
        _bidDepositAmount = bidDepositAmount;
        _highestBidValue = reservePrice;
        _secondHighestBidValue = reservePrice;
        _reservePrice = reservePrice;
        _highestBidValue = 0;
        _highestBidder = 0;
    }

    // Record the player's bid commitment
    // Make sure at least _bidDepositAmount is provided
    // Only allow commitments before the _bidCommitmentDeadline
    function commitBid(bytes32 bidCommitment) payable returns(bool) {
        // TODO: place your code here

    }

    // Check that the bid (msg.value) matches the commitment
    // Ignore the bid if it is less than the reserve price
    // Update the highest price, second highest price, highest bidder
    // If the second highest bidder is replaced, send them a refund
    function revealBid(bytes32 nonce) payable returns(address highestBidder) {
        // TODO: place your code here

    }

    // Handle the end of the auction
    // Refund the difference between the first price and second price
    function finalize() {
        // TODO: place your code here

    }

    // Commitment utility
    function makeCommitment(bytes32 nonce, uint256 bidValue) constant returns(bytes32) {
        return sha3(nonce, bidValue);
    }

    // No need to change any code below here

    bool _testMode;
    uint256 public _testTime;
    address _creator;

    modifier testOnly {
      require(_testMode);
      _;
    }

    modifier creatorOnly {
      require(msg.sender == _creator);
      _;
    }

    function overrideTime(uint256 time) creatorOnly testOnly {
        _testTime = time;
    }

    function getBlockNumber() internal constant returns (uint256) {
        if (_testMode) return _testTime;
        return block.number;
    }
}

contract ProxyBidder {
    VickreyAuction _auction;
    function ProxyBidder(VickreyAuction auction) payable {
        _auction = auction;
    }
    function commitBid(bytes32 nonce, uint256 bidValue, uint256 depositValue) {
        assert(bidValue + depositValue <= this.balance);
        bytes32 com = _auction.makeCommitment(nonce, bidValue);
        _auction.commitBid.value(depositValue)(com);
    }
    function revealBid(bytes32 nonce, uint256 bidValue) {
        assert(bidValue <= this.balance);
        _auction.revealBid.value(bidValue)(nonce);
    }
    function() payable {
    }
}

contract VickreyAuctionTester {

    event LogTestFailed(string test);
    event LogNumFailures(string msg, uint);

    function VickreyAuctionTester() payable { }

    function test() payable returns(string) {
        uint failedTests = 0;

        if (this.balance < 300) {
            return "This contract needs a balance of at least 300";
        }

        VickreyAuction auction = new VickreyAuction(0, 5, 5, 10, true);

        ProxyBidder b1 = (new ProxyBidder).value(50)(auction);
        ProxyBidder b2 = (new ProxyBidder).value(50)(auction);
        ProxyBidder b3 = (new ProxyBidder).value(50)(auction);


        // Bids less than the deposit should fail
        if (b1.call.gas(50000)(bytes4(keccak256("commitBid(bytes32,uint256,uint256)")), bytes32(0x2423423), 0, 0)) {
            LogTestFailed("Bids with insuficient deposit should fail");
            failedTests++;
        }

        // Three successful bids
        if (!b1.call.gas(50000)(bytes4(keccak256("commitBid(bytes32,uint256,uint256)")), bytes32(0x2423423), 10, 10)) {
            LogTestFailed("Bid b1 failed");
            failedTests++;
        }
        if (auction.bids(address(b1)) == 0) {
            LogTestFailed("Bid b1 was not recorded");
            failedTests++;
        }

        if (!b2.call.gas(50000)(bytes4(keccak256("commitBid(bytes32,uint256,uint256)")), bytes32(0x99999), 20, 10)) {
            LogTestFailed("Bid b2 failed");
            failedTests++;
        }
        if (auction.bids(address(b2)) == 0) {
            LogTestFailed("Bid b2 was not recorded");
            failedTests++;
        }

        if (!b3.call.gas(50000)(bytes4(keccak256("commitBid(bytes32,uint256,uint256)")), bytes32(0x13123), 30, 10)) {
            LogTestFailed("Bid b3 failed");
            failedTests++;
        }
        if (auction.bids(address(b3)) == 0) {
            LogTestFailed("Bid b3 was not recorded");
            failedTests++;
        }

        // Reveals before commit deadline should fail
        if (b1.call.gas(150000)(bytes4(keccak256("revealBid(bytes32,uint256)")), bytes32(0x2423423), 10, 10)) {
            LogTestFailed("Reveal before commit deadline should fail");
            failedTests++;
        }

        // Advance past commitment deadline
        auction.overrideTime(7);

        // Commitments after the deadline should fail
        if (b1.call.gas(150000)(bytes4(keccak256("commitBid(bytes32,uint256,uint256)")), bytes32(0x88888), 20, 10)) {
            LogTestFailed("Bids after commit deadline should fail");
            failedTests++;
        }

        // Wrong nonce reveal
        if (b1.call.gas(150000)(bytes4(keccak256("revealBid(bytes32,uint256)")), bytes32(0x111), 10, 10)) {
            LogTestFailed("Reveal with the wrong nonce should fail");
            failedTests++;
        }

        // Successful reveal
        if (!b1.call.gas(150000)(bytes4(keccak256("revealBid(bytes32,uint256)")), bytes32(0x2423423), 10, 10)) {
            LogTestFailed("Reveal b1 failed");
            failedTests++;
        }
        if (auction._highestBidValue() != 10) {
            LogTestFailed("After b1 reveals, high bid should be 10");
            failedTests++;
        }
        if (auction._highestBidder() != address(b1)) {
            LogTestFailed("After b1 reveals, high bidder should be b1");
            failedTests++;
        }

        if (!b2.call.gas(150000)(bytes4(keccak256("revealBid(bytes32,uint256)")), bytes32(0x99999), 20, 10)) {
            LogTestFailed("Reveal b2 failed");
            failedTests++;
        }
        if (auction._highestBidValue() != 20) {
            LogTestFailed("After b2 reveals, high bid should be 20");
            failedTests++;
        }
        if (auction._highestBidder() != address(b2)) {
            LogTestFailed("After b2 reveals, high bidder should be b2");
            failedTests++;
        }

        // Reveal twice should fail
        if (b2.call.gas(150000)(bytes4(keccak256("revealBid(bytes32,uint256)")), bytes32(0x99999), 20, 10)) {
            LogTestFailed("Reveal twice should fail");
            failedTests++;
        }

        // Advanced past Reveal eadline
        auction.overrideTime(15);

        // Reveals after reveal deadline should fail
        if (b3.call.gas(150000)(bytes4(keccak256("revealBid(bytes32,uint256)")), bytes32(0x13123), 30, 10)) {
            LogTestFailed("Reveals after reveal deadline should fail");
            failedTests++;
        }

        // B2 should win
        if (address(b1).balance != 50) {
            LogTestFailed("b1 should have been refunded (balance should be 50)");
            failedTests++;
        }
        if (address(b2).balance != 30) {
            LogTestFailed("b2 should have been refunded security deposit (balance should be 30");
            failedTests++;
        }

        if (failedTests == 0){
            return "All tests pased :-)";
        }
        LogNumFailures("Number of failed tests:", failedTests);
        return "Some tests failed. Check the log";
    }
}
