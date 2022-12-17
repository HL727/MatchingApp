import React, {useState, useCallback} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {IconButton, TextInput} from 'react-native-paper';
import {StyleSheet, TouchableHighlight} from 'react-native';
import {View, Text} from 'react-native-ui-lib';
import auth from '@react-native-firebase/auth';
// import RNSmtpMailer from 'react-native-smtp-mailer';

import {useAppDispatch, useAppSelector} from '../../redux/reduxHooks';
import {
  setLoginMethod,
  setTempUser,
  setLoading,
} from '../../redux/features/globalSlice';

import {Colors} from '../../styles';
import {Container, CustomButton, CustomText} from '../../components';
import axios from 'axios';

import Loader from '../../components/Loader';

var emailConfirmCodeBaseURL =
  'https://us-central1-okyuin-akiba.cloudfunctions.net/sendMail';

const Register = ({navigation}: any) => {
  const tempUser = useAppSelector((state: any) => state.global.tempUser);
  const loginMethod = useAppSelector((state: any) => state.global.loginMethod); // 'mobile' or 'email'
  const isLoading = useAppSelector((state: any) => state.global.isLoading);

  const dispatch = useAppDispatch();

  const [email, setEmail] = useState<string>(tempUser.email);
  const [mobile, setMobile] = useState<string>(tempUser.mobile);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      return setError('');
    }, []),
  );

  const handleToConfirmCode = async () => {
    dispatch(
      setTempUser({
        ...tempUser,
        [loginMethod]: loginMethod === 'email' ? email : mobile,
      }),
    );
    let code = '',
      confirmation = null;
    if (loginMethod === 'email') {
      try {
        if (email) {
          setError('');
          dispatch(setLoading(true));
          for (let i = 0; i < 6; i++) {
            let each = Math.floor(Math.random() * 10) % 10;
            code += `${each}`;
          }
          const res = await axios.get(
            emailConfirmCodeBaseURL + `?dest=${email}&code=${code}`,
          );
          console.log(res.data);
          if (res.data === 'Sended') {
            dispatch(setLoading(false));
            return navigation.navigate('ConfirmCode', {code, confirmation});
          }
        } else {
          setError('メールアドレスが入力されていません。');
        }
      } catch (err) {
        console.log(err);
        setError('何かがうまくいかなかった');
      }
    } else if (loginMethod === 'mobile') {
      try {
        if (mobile) {
          setError('');
          dispatch(setLoading(true));
          confirmation = await auth().verifyPhoneNumber(`+81${mobile}`);
          console.log('confirm finished');
          if (confirmation) {
            console.log(confirmation);
            dispatch(setLoading(false));
            return navigation.navigate('ConfirmCode', {confirmation, code});
          }
        } else {
          setError('電話番号を入力されていませんに変更してください。');
        }
      } catch (err) {
        console.log(err);
        setError('何かがうまくいかなかった');
      }
    }
  };

  return (
    <Container bottom centerH>
      <Loader isLoading={isLoading} />
      <IconButton
        icon="chevron-left"
        color={Colors.white}
        style={styles.backIcon}
        size={30}
        onPress={() => navigation.goBack()}
      />
      {loginMethod === 'mobile' ? (
        <>
          {tempUser.mobile !== '' ? (
            <CustomText marginB-30>
              この電話番号は登録されていません 新規登録いたしますか？
            </CustomText>
          ) : (
            <CustomText marginB-30>電話番号を入力してください</CustomText>
          )}
          <View row>
            <TextInput
              underlineColor={Colors.white}
              activeUnderlineColor={Colors.white}
              style={{...styles.phonePrefixInput}}
              theme={{colors: {text: Colors.white}}}
              value={'+81'}
            />
            <TextInput
              underlineColor={Colors.white}
              activeUnderlineColor={Colors.white}
              style={{...styles.phoneNumberInput}}
              theme={{colors: {text: Colors.white}}}
              value={mobile}
              onChangeText={text => setMobile(text.replace(/[^0-9]/g, ''))}
            />
          </View>
          {error ? (
            <View>
              <Text style={styles.error}>{error}</Text>
            </View>
          ) : (
            <></>
          )}
          <CustomButton label="はい" onPress={handleToConfirmCode} />
          <View marginT-10></View>
          <TouchableHighlight
            onPress={() => {
              setError('');
              dispatch(setLoginMethod('email'));
            }}
          >
            <CustomText>メールアドレスで登録</CustomText>
          </TouchableHighlight>
          <View marginB-40></View>
        </>
      ) : (
        <>
          {tempUser.email !== '' ? (
            <CustomText marginB-30>
              このメールアドレスは登録されていません 新規登録いたしますか？
            </CustomText>
          ) : (
            <CustomText marginB-30>メールアドレスを入力してください</CustomText>
          )}
          <TextInput
            underlineColor={Colors.white}
            activeUnderlineColor={Colors.white}
            style={{...styles.emailInput}}
            theme={{colors: {text: Colors.white}}}
            value={email}
            onChangeText={text => setEmail(text)}
          />
          {error ? (
            <View>
              <Text style={styles.error}>{error}</Text>
            </View>
          ) : (
            <></>
          )}
          <CustomButton label="はい" onPress={handleToConfirmCode} />
          <View marginT-10></View>
          <TouchableHighlight
            onPress={() => {
              setError('');
              dispatch(setLoginMethod('mobile'));
            }}
          >
            <CustomText>電話番号で登録</CustomText>
          </TouchableHighlight>
          <View marginB-40></View>
        </>
      )}
    </Container>
  );
};

const styles = StyleSheet.create({
  backIcon: {
    position: 'absolute',
    left: 0,
    top: 30,
  },
  emailInput: {
    height: 30,
    width: '80%',
    marginBottom: 50,
    backgroundColor: 'transparent',
  },
  phonePrefixInput: {
    height: 30,
    width: '13%',
    marginBottom: 50,
    backgroundColor: 'transparent',
  },
  phoneNumberInput: {
    height: 30,
    width: '64%',
    marginLeft: '3%',
    marginBottom: 50,
    backgroundColor: 'transparent',
  },
  error: {
    color: Colors.red1,
  },
});

export default Register;
