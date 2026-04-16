// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

/// @title KYC Registry - Faris Ali
contract KYCRegistry_FarisAli {
    address public admin;

    enum KYCStatus { None, Pending, Approved, Rejected }

    struct KYCRequest {
        string fullName;
        string cnic;
        KYCStatus status;
        address requester;
    }

    mapping(address => KYCRequest) public requests;
    address[] public requesters;

    event KYCSubmitted(address indexed requester, string fullName, string cnic);
    event KYCApproved(address indexed requester, string approvedName);
    event KYCRejected(address indexed requester, string reason);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function submitKYC(string calldata fullName, string calldata cnic) external {
        KYCRequest storage r = requests[msg.sender];
        require(r.status != KYCStatus.Pending, "Already pending");
        require(r.status != KYCStatus.Approved, "Already approved");
        requests[msg.sender] = KYCRequest({
            fullName: fullName,
            cnic: cnic,
            status: KYCStatus.Pending,
            requester: msg.sender
        });
        requesters.push(msg.sender);
        emit KYCSubmitted(msg.sender, fullName, cnic);
    }

    function approveKYC(address user, string calldata approvedName) external onlyAdmin {
        require(requests[user].status == KYCStatus.Pending, "Not pending");
        requests[user].status = KYCStatus.Approved;
        requests[user].fullName = approvedName;
        emit KYCApproved(user, approvedName);
    }

    function rejectKYC(address user, string calldata reason) external onlyAdmin {
        require(requests[user].status == KYCStatus.Pending, "Not pending");
        requests[user].status = KYCStatus.Rejected;
        emit KYCRejected(user, reason);
    }

    function isApproved(address user) external view returns (bool) {
        return requests[user].status == KYCStatus.Approved;
    }

    function getRequesters() external view returns (address[] memory) {
        return requesters;
    }

    function getKYC(address user) external view returns (string memory fullName, string memory cnic, KYCStatus status) {
        KYCRequest storage r = requests[user];
        return (r.fullName, r.cnic, r.status);
    }
}
