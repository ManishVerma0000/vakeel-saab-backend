const bcrypt=require('bcrypt')
const {addUser}=require('../utils/util')


const userLogin=(requestBody)=>{
    console.log(requestBody)
    return requestBody;
}

const userRegistration=async(requestBody)=>{
    try {
    const { username, password, role } = requestBody;
    if(!username||!password||!role){
     return {response:{},statusCode:400,message:"enter all the details"}
    }
    const passwordHash = await bcrypt.hash(password, 10)
    const user = addUser(username, passwordHash, role);
    return {response:user,statusCode:200,message:"user is registered successfully"};

    } catch (error) {
        return {response:error.message,statusCode:400,message:error.message}
    }


}

module.exports={userLogin,userRegistration}