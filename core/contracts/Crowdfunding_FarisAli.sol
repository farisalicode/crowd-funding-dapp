// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

interface IKYCRegistry {
    function isApproved(address user) external view returns (bool);
}

contract Crowdfunding_FarisAli {
    IKYCRegistry public kycRegistry;
    address public admin;
    uint256 public nextCampaignId;

    enum Status { Active, Completed, Withdrawn }

    struct Campaign {
        uint256 id;
        address creator;
        string title;
        string description;
        uint256 goal; // wei
        uint256 fundsRaised; // wei
        Status status;
    }

    mapping(uint256 => Campaign) public campaigns;
    uint256[] public campaignIds;
    mapping(uint256 => mapping(address => uint256)) public contributions;

    event CampaignCreated(uint256 indexed id, address indexed creator, string title, uint256 goal);
    event Contributed(uint256 indexed id, address indexed contributor, uint256 amount);
    event CampaignCompleted(uint256 indexed id);
    event Withdrawn(uint256 indexed id, address indexed creator, uint256 amount);

    modifier onlyVerifiedOrAdmin() {
        if (msg.sender != admin) {
            require(kycRegistry.isApproved(msg.sender), "Not KYC verified");
        }
        _;
    }

    constructor(address _kycRegistry) {
        kycRegistry = IKYCRegistry(_kycRegistry);
        admin = msg.sender;
        nextCampaignId = 1;
    }

    function createCampaign(
        string calldata title,
        string calldata description,
        uint256 goalInWei
    ) external onlyVerifiedOrAdmin {
        require(goalInWei > 0, "Goal must be > 0");
        uint256 cid = nextCampaignId++;
        campaigns[cid] = Campaign({
            id: cid,
            creator: msg.sender,
            title: title,
            description: description,
            goal: goalInWei,
            fundsRaised: 0,
            status: Status.Active
        });
        campaignIds.push(cid);
        emit CampaignCreated(cid, msg.sender, title, goalInWei);
    }

    function contribute(uint256 campaignId) external payable {
        Campaign storage c = campaigns[campaignId];
        require(c.id != 0, "Campaign not found");
        require(c.status == Status.Active, "Campaign not active");
        require(msg.value > 0, "Must send ETH");

        c.fundsRaised += msg.value;
        contributions[campaignId][msg.sender] += msg.value;
        emit Contributed(campaignId, msg.sender, msg.value);

        if (c.fundsRaised >= c.goal) {
            c.status = Status.Completed;
            emit CampaignCompleted(campaignId);
        }
    }

    function withdraw(uint256 campaignId) external {
        Campaign storage c = campaigns[campaignId];
        require(c.id != 0, "Campaign not found");
        require(msg.sender == c.creator, "Only creator can withdraw");
        require(c.status == Status.Completed, "Campaign not completed");

        uint256 amount = c.fundsRaised;
        c.fundsRaised = 0; // reset before transfer
        c.status = Status.Withdrawn;

        (bool sent, ) = payable(msg.sender).call{value: amount}("");
        require(sent, "Withdraw failed");
        emit Withdrawn(campaignId, msg.sender, amount);
    }

    // view helpers
    function totalCampaigns() external view returns (uint256) {
        return campaignIds.length;
    }

    function getCampaignIds() external view returns (uint256[] memory) {
        return campaignIds;
    }

    function getCampaign(uint256 cid) external view returns (
        uint256 id,
        address creator,
        string memory title,
        string memory description,
        uint256 goal,
        uint256 fundsRaised,
        Status status
    ) {
        Campaign storage c = campaigns[cid];
        return (c.id, c.creator, c.title, c.description, c.goal, c.fundsRaised, c.status);
    }
}
